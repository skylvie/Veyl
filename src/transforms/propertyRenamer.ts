import type { BabelNode, PropKeyNode } from "../babel/interop.js";
import { traverse } from "../babel/interop.js";
import { staticKeyName } from "../babel/predicates.js";
import type { NameGenerator } from "../utils/random.js";

interface PropertyPath {
    node: PropKeyNode;
    parentPath?: {
        parent?: BabelNode;
    };
}

interface VariableDeclaratorPath {
    node: {
        id: BabelNode;
        init: BabelNode | null;
    };
}

interface MemberExpressionPath {
    node: {
        computed: boolean;
        object: BabelNode;
        property: BabelNode;
    };
}

interface PropertyRenameResult {
    renamedProperties: number;
}

// Renames properties declared on local object/class shapes and matching local accesses.
export function renameProperties(ast: object, names: NameGenerator): PropertyRenameResult {
    const propMap = new Map<string, string>();
    const localObjBindings = new Set<string>();

    traverse(ast, {
        "ObjectProperty|ObjectMethod|ClassProperty|ClassMethod|ClassAccessorProperty"(pathNode: PropertyPath) {
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
        },
    });

    traverse(ast, {
        "ObjectProperty|ObjectMethod|ClassProperty|ClassMethod|ClassAccessorProperty"(pathNode: PropertyPath) {
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
                (pathNode.node.key as BabelNode & {
                    value: string;
                }).value = replacement;

                (pathNode.node.key as BabelNode & {
                    extra?: {
                        rawValue?: string;
                        raw?: string;
                    };
                }).extra = {
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

            if (pathNode.node.object.type !== "Identifier") {
                return;
            }

            if (!localObjBindings.has(pathNode.node.object.name!)) {
                return;
            }

            const name = pathNode.node.property.name!;
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
        name === "maxStringLength"
    ) {
        return true;
    }

    const objectParent = pathNode.parentPath?.parent;

    if (objectParent?.type === "CallExpression" || objectParent?.type === "NewExpression") {
        return true;
    }

    return false;
}
