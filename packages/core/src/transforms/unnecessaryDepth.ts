import * as t from "@babel/types";
import { traverse } from "../babel/interop.js";
import type { BabelNode } from "../types/babel.js";
import type {
    CallablePath,
    IdentifierNode,
    StatementPath,
    UnnecessaryDepthResult,
} from "../types/transforms.js";
import type { NameGenerator } from "../utils/random.js";

// Adds an extra local reference before direct function and class constructor calls
export function addUnnecessaryDepth(ast: object, names: NameGenerator): UnnecessaryDepthResult {
    let addedReferences = 0;

    traverse(ast, {
        CallExpression(pathNode: CallablePath) {
            if (addReferenceBeforeCall(pathNode, names)) {
                addedReferences++;
            }
        },

        NewExpression(pathNode: CallablePath) {
            if (addReferenceBeforeCall(pathNode, names)) {
                addedReferences++;
            }
        },
    });

    return {
        addedReferences,
    };
}

function addReferenceBeforeCall(pathNode: CallablePath, names: NameGenerator): boolean {
    const callee = pathNode.node.callee;

    if (pathNode.node.optional === true || !isAliasableIdentifier(callee)) {
        return false;
    }

    const statementPath = pathNode.getStatementParent();

    if (statementPath === null || !canInsertStatementBefore(statementPath)) {
        return false;
    }

    const aliasName = names.freshIdentifier();

    statementPath.insertBefore(
        t.variableDeclaration("const", [
            t.variableDeclarator(
                t.identifier(aliasName),
                t.cloneNode(callee as unknown as t.Expression)
            ),
        ])
    );

    pathNode.node.callee = t.identifier(aliasName) as unknown as BabelNode;

    return true;
}

function isAliasableIdentifier(node: BabelNode): node is IdentifierNode {
    if (node.type !== "Identifier" || typeof node.name !== "string") {
        return false;
    }

    return node.name !== "eval";
}

function canInsertStatementBefore(statementPath: StatementPath): boolean {
    const parentType = statementPath.parent?.type;

    return (
        parentType === "Program" || parentType === "BlockStatement" || parentType === "SwitchCase"
    );
}
