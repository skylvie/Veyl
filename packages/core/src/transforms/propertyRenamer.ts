import { traverse } from "../babel/interop.js";
import { staticKeyName } from "../babel/predicates.js";
import type { BabelNode } from "../types/babel.js";
import type {
    ClassDeclarationPath,
    MemberExpressionNode,
    MemberExpressionPath,
    NewExpressionNode,
    PropertyPath,
    PropertyRenameResult,
    VariableDeclaratorPath,
} from "../types/transforms.js";
import type { NameGenerator } from "../utils/random.js";

// Renames properties declared on local object/class shapes and matching local accesses.
export function renameProperties(ast: object, names: NameGenerator): PropertyRenameResult {
    const propMap = new Map<string, string>();
    const localObjBindings = new Set<string>();
    const localClassBindings = new Set<string>();
    const localClassInstanceBindings = new Set<string>();

    traverse(ast, {
        "ObjectProperty|ObjectMethod|ClassProperty|ClassMethod|ClassAccessorProperty"(
            pathNode: PropertyPath
        ) {
            if (pathNode.node.computed || shouldSkipPropertyRename(pathNode)) {
                return;
            }

            const name = staticKeyName(pathNode.node.key);

            if (name !== null && !propMap.has(name)) {
                propMap.set(name, names.freshIdentifier());
            }
        },

        VariableDeclarator(pathNode: VariableDeclaratorPath) {
            if (
                pathNode.node.id.type === "Identifier" &&
                typeof pathNode.node.id.name === "string" &&
                pathNode.node.init?.type === "ObjectExpression"
            ) {
                localObjBindings.add(pathNode.node.id.name);
            }

            if (
                pathNode.node.id.type === "Identifier" &&
                typeof pathNode.node.id.name === "string" &&
                pathNode.node.init?.type === "ClassExpression"
            ) {
                localClassBindings.add(pathNode.node.id.name);
            }

            const init = pathNode.node.init;

            if (init?.type === "NewExpression") {
                const newExpression = init as NewExpressionNode;

                if (
                    pathNode.node.id.type === "Identifier" &&
                    typeof pathNode.node.id.name === "string" &&
                    newExpression.callee.type === "Identifier" &&
                    typeof newExpression.callee.name === "string" &&
                    localClassBindings.has(newExpression.callee.name)
                ) {
                    localClassInstanceBindings.add(pathNode.node.id.name);
                }
            }
        },

        ClassDeclaration(pathNode: ClassDeclarationPath) {
            if (
                pathNode.node.id?.type === "Identifier" &&
                typeof pathNode.node.id.name === "string"
            ) {
                localClassBindings.add(pathNode.node.id.name);
            }
        },
    });

    traverse(ast, {
        "ObjectProperty|ObjectMethod|ClassProperty|ClassMethod|ClassAccessorProperty"(
            pathNode: PropertyPath
        ) {
            if (pathNode.node.computed || shouldSkipPropertyRename(pathNode)) {
                return;
            }

            const name = staticKeyName(pathNode.node.key);

            if (name === null) {
                return;
            }

            const replacement = propMap.get(name);

            if (replacement === undefined) {
                return;
            }

            if (pathNode.node.key.type === "Identifier") {
                pathNode.node.key.name = replacement;
            } else if (pathNode.node.key.type === "StringLiteral") {
                (
                    pathNode.node.key as BabelNode & {
                        value: string;
                    }
                ).value = replacement;

                (
                    pathNode.node.key as BabelNode & {
                        extra?: {
                            rawValue?: string;
                            raw?: string;
                        };
                    }
                ).extra = {
                    rawValue: replacement,
                    raw: JSON.stringify(replacement),
                };
            }
        },

        "MemberExpression|OptionalMemberExpression"(pathNode: MemberExpressionPath) {
            if (pathNode.node.computed) {
                return;
            }

            if (pathNode.node.property.type !== "Identifier") {
                return;
            }

            if (
                !isLocalPropertyAccess(
                    pathNode.node.object,
                    localObjBindings,
                    localClassInstanceBindings
                )
            ) {
                return;
            }

            const name = pathNode.node.property.name;

            if (typeof name !== "string") {
                return;
            }

            const replacement = propMap.get(name);

            if (replacement !== undefined) {
                pathNode.node.property.name = replacement;
            }
        },
    });

    return {
        renamedProperties: propMap.size,
    };
}

function isLocalPropertyAccess(
    node: BabelNode,
    localObjBindings: Set<string>,
    localClassInstanceBindings: Set<string>
): boolean {
    if (node.type === "ThisExpression") {
        return true;
    }

    if (node.type === "Identifier") {
        return (
            typeof node.name === "string" &&
            (localObjBindings.has(node.name) || localClassInstanceBindings.has(node.name))
        );
    }

    if (node.type !== "MemberExpression" && node.type !== "OptionalMemberExpression") {
        return false;
    }

    const memberExpression = node as MemberExpressionNode;

    if (memberExpression.computed || memberExpression.property.type !== "Identifier") {
        return false;
    }

    return isLocalPropertyAccess(
        memberExpression.object,
        localObjBindings,
        localClassInstanceBindings
    );
}

// Leaves externally meaningful property names alone.
function shouldSkipPropertyRename(pathNode: PropertyPath): boolean {
    const name = staticKeyName(pathNode.node.key);

    if (name === null) {
        return true;
    }

    if (
        name === "depth" ||
        name === "colors" ||
        name === "showHidden" ||
        name === "maxArrayLength" ||
        name === "maxStringLength" ||
        name === "constructor"
    ) {
        return true;
    }

    const objectParent = pathNode.parentPath?.parent;

    if (objectParent?.type === "CallExpression" || objectParent?.type === "NewExpression") {
        return true;
    }

    return false;
}
