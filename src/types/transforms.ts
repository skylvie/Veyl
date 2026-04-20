import type * as t from "@babel/types";
import type { BabelNode, PropKeyNode } from "./babel.js";
import type { NumberObfuscationOperator } from "./config.js";

export interface LiteralObfuscationResult {
    helperNodes: t.Statement[];
    stringCount: number;
    numberCount: number;
    booleanCount: number;
    booleanNumber: number | null;
    numberOffset: number | null;
    numberOperators: NumberObfuscationOperator[];
}

export interface UnnecessaryDepthResult {
    addedReferences: number;
}

export interface CallablePath {
    node: {
        callee: BabelNode;
        optional?: boolean;
    };
    getStatementParent(): StatementPath | null;
}

export interface StatementPath {
    parent?: BabelNode;
    insertBefore(node: t.Statement): void;
}

export interface IdentifierNode extends BabelNode {
    type: "Identifier";
    name: string;
}

export interface PropertyPath {
    node: PropKeyNode;
    parentPath?: {
        parent?: BabelNode;
    };
}

export interface VariableDeclaratorPath {
    node: {
        id: BabelNode;
        init: BabelNode | null;
    };
}

export interface ClassDeclarationPath {
    node: {
        id: BabelNode | null;
    };
}

export interface MemberExpressionPath {
    node: {
        computed: boolean;
        object: BabelNode;
        property: BabelNode;
    };
}

export interface MemberExpressionNode extends BabelNode {
    computed: boolean;
    object: BabelNode;
    property: BabelNode;
}

export interface NewExpressionNode extends BabelNode {
    callee: BabelNode;
}

export interface PropertyRenameResult {
    renamedProperties: number;
}
