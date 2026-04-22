import generateModule from "@babel/generator";
import traverseModule from "@babel/traverse";
import type { GenerateFn, TraverseFn } from "../types/babel.js";

const traverseValue = traverseModule as unknown as TraverseFn | { default?: TraverseFn };
const generateValue = generateModule as unknown as GenerateFn | { default?: GenerateFn };

export const traverse = (
    typeof traverseValue === "function" ? traverseValue : traverseValue.default
) as TraverseFn;

export const generate = (
    typeof generateValue === "function" ? generateValue : generateValue.default
) as GenerateFn;
