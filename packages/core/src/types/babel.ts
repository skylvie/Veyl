export interface BabelScope {
    bindings: Record<string, unknown>;
    crawl(): void;
    hasOwnBinding(name: string): boolean;
    rename(oldName: string, newName?: string): void;
}

export interface BabelNode {
    type: string;
    name?: string;
    value?: unknown;
    key?: BabelNode;
    computed?: boolean;
    extra?: unknown;
}

export interface BabelNodePath {
    node?: BabelNode;
    parent?: BabelNode;
    parentPath?: BabelNodePath;
    key?: string | number;
    scope: BabelScope;
    replaceWith(node: BabelNode): void;
}

export interface PropKeyNode extends BabelNode {
    key: BabelNode;
    computed?: boolean;
}

export type TraverseFn = (ast: object, visitors: Record<string, unknown>) => void;
export type GenerateFn = (ast: object, opts?: object) => { code: string };
