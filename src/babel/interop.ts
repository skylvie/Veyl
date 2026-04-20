import { createRequire } from "node:module";

/*
    Minimal inline types for Babel traversal objects used by the transforms.

    TS with `module: NodeNext` can resolve CJS Babel packages as module namespace values, 
    so callable Babel packages are loaded through `createRequire`.
*/

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
}

export interface BabelNodePath {
    node?: BabelNode;
    parent?: BabelNode;
    key?: string;
    replaceWith(node: BabelNode): void;
    scope: BabelScope;
}

export interface PropKeyNode extends BabelNode {
    computed: boolean;
    key: BabelNode;
}

export type TraverseFn = (ast: object, visitors: Record<string, unknown>) => void;
export type GenerateFn = (ast: object, opts?: object) => { code: string };

const requireFromModule = createRequire(import.meta.url);

export const traverse = (
    requireFromModule("@babel/traverse").default ??
    requireFromModule("@babel/traverse")
) as TraverseFn;

export const generate = (
    requireFromModule("@babel/generator").default ??
    requireFromModule("@babel/generator")
) as GenerateFn;
