import type { BabelNode, BabelNodePath, PropKeyNode } from "../types/babel.js";

export function isPropertyKeyNode(pathNode: BabelNodePath): boolean {
    if (!pathNode.parent || pathNode.key !== "key") {
        return false;
    }

    const parentType = pathNode.parent.type;

    if (
        parentType === "ObjectProperty" ||
        parentType === "ObjectMethod" ||
        parentType === "ClassProperty" ||
        parentType === "ClassMethod" ||
        parentType === "ClassAccessorProperty"
    ) {
        return !(pathNode.parent as PropKeyNode).computed;
    }

    return false;
}

export function isModuleStringLiteral(pathNode: BabelNodePath): boolean {
    if (!pathNode.parent || pathNode.key !== "source") {
        return false;
    }

    return (
        pathNode.parent.type === "ImportDeclaration" ||
        pathNode.parent.type === "ExportAllDeclaration" ||
        pathNode.parent.type === "ExportNamedDeclaration"
    );
}

export function isDirectiveLiteral(pathNode: BabelNodePath): boolean {
    return !!pathNode.parent && pathNode.parent.type === "Directive";
}

export function staticKeyName(node: BabelNode): string | null {
    if (node.type === "Identifier" && typeof node.name === "string") {
        return node.name;
    }

    if (node.type === "StringLiteral" && typeof node.value === "string") {
        return node.value as string;
    }

    return null;
}
