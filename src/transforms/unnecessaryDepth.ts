import type { BabelNode } from "../babel/interop.js";
import { traverse } from "../babel/interop.js";
import type { NameGenerator } from "../utils/random.js";
import * as t from "@babel/types";

interface UnnecessaryDepthResult {
    addedReferences: number;
}

interface CallablePath {
    node: {
        callee: BabelNode;
        optional?: boolean;
    };
    getStatementParent(): StatementPath | null;
}

interface StatementPath {
    parent?: BabelNode;
    insertBefore(node: t.Statement): void;
}

interface IdentifierNode extends BabelNode {
    type: "Identifier";
    name: string;
}

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
                t.cloneNode(callee) as t.Expression,
            ),
        ]),
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

    return parentType === "Program" ||
        parentType === "BlockStatement" ||
        parentType === "SwitchCase";
}
