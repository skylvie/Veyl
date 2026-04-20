import { createRequire } from "node:module";
import type { GenerateFn, TraverseFn } from "../types/babel.js";

/*
    TS with `module: NodeNext` can resolve CJS Babel packages as module namespace values, 
    so callable Babel packages are loaded through `createRequire`.
*/

const requireFromModule = createRequire(import.meta.url);

export const traverse = (requireFromModule("@babel/traverse").default ??
    requireFromModule("@babel/traverse")) as TraverseFn;

export const generate = (requireFromModule("@babel/generator").default ??
    requireFromModule("@babel/generator")) as GenerateFn;
