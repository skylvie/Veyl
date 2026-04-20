import type { BabelNode, BabelNodePath } from "../babel/interop.js";
import type { NameGenerator } from "../utils/random.js";
import { traverse } from "../babel/interop.js";
import { buildRuntimeHelpers } from "../runtime/index.js";
import { isDirectiveLiteral, isModuleStringLiteral, isPropertyKeyNode } from "../babel/predicates.js";
import { encodeStringLiteralValue, randomAsciiString } from "../utils/random.js";
import * as t from "@babel/types";
import crypto from "node:crypto";

interface LiteralObfuscationResult {
    helperNodes: t.Statement[];
    stringCount: number;
    numberCount: number;
    booleanCount: number;
}

type NumberOperator = "+" | "-" | "*" | "/";
type NumberOperatorFamily = "additive" | "multiplicative";

const ADDITIVE_NUMBER_SHIFT_MIN = 100_000;
const ADDITIVE_NUMBER_SHIFT_MAX = 999_999;
const MULTIPLICATIVE_NUMBER_SHIFT_MIN = 100;
const MULTIPLICATIVE_NUMBER_SHIFT_MAX = 999;

// Replaces string, number, and boolean literals with runtime decoder calls
export function obfuscateLiterals(ast: object, names: NameGenerator): LiteralObfuscationResult {
    const stringTableName = names.freshIdentifier();
    const stringAccessorName = names.freshIdentifier();
    const stringDecoderName = names.freshIdentifier();
    const numberDecoderName = names.freshIdentifier();
    const boolDecoderName = names.freshIdentifier();
    const stringXorKey = crypto.randomInt(1, 256);
    const numberFamily: NumberOperatorFamily = crypto.randomInt(0, 2) === 0 ? "additive" : "multiplicative";
    const numberShift = numberFamily === "additive"
        ? crypto.randomInt(ADDITIVE_NUMBER_SHIFT_MIN, ADDITIVE_NUMBER_SHIFT_MAX + 1)
        : crypto.randomInt(MULTIPLICATIVE_NUMBER_SHIFT_MIN, MULTIPLICATIVE_NUMBER_SHIFT_MAX + 1);

    let trueToken = crypto.randomInt(10000, 99999);
    let falseToken = crypto.randomInt(10000, 99999);

    while (falseToken === trueToken) {
        falseToken = crypto.randomInt(10000, 99999);
    }

    const stringLiteralPaths: BabelNodePath[] = [];

    traverse(ast, {
        StringLiteral(pathNode: BabelNodePath) {
            if (!pathNode.node || typeof pathNode.node.value !== "string") {
                return;
            }

            if (isDirectiveLiteral(pathNode) || isModuleStringLiteral(pathNode) || isPropertyKeyNode(pathNode)) {
                return;
            }

            stringLiteralPaths.push(pathNode);
        },
    });

    const encodedStringTable = new Array<string[]>(stringLiteralPaths.length * 2);
    const availableIndices = Array.from({ length: encodedStringTable.length }, (_, idx) => idx);

    for (let i = 0; i < encodedStringTable.length; i++) {
        encodedStringTable[i] = chunkEncodedString(encodeStringLiteralValue(randomAsciiString(), stringXorKey));
    }

    for (const literalPath of stringLiteralPaths) {
        const pickAt = crypto.randomInt(0, availableIndices.length);
        const tableIndex = availableIndices[pickAt];

        availableIndices.splice(pickAt, 1);
        encodedStringTable[tableIndex] = chunkEncodedString(encodeStringLiteralValue(literalPath.node!.value as string, stringXorKey));

        literalPath.replaceWith(
            t.callExpression(t.identifier(stringDecoderName), [
                t.callExpression(t.identifier(stringAccessorName), [t.numericLiteral(tableIndex)]),
            ]) as unknown as BabelNode,
        );
    }

    const numericLiteralPaths: BabelNodePath[] = [];

    traverse(ast, {
        NumericLiteral(pathNode: BabelNodePath) {
            if (!pathNode.node || typeof pathNode.node.value !== "number") {
                return;
            }

            if (isPropertyKeyNode(pathNode)) {
                return;
            }

            numericLiteralPaths.push(pathNode);
        },
    });

    let numberCount = 0;

    for (const numberPath of numericLiteralPaths) {
        const original = numberPath.node?.value;

        if (typeof original !== "number") {
            continue;
        }

        const numberOp = pickNumberOperator(numberFamily);
        const opToken = encodeNumberOperator(numberOp);
        const encoded = numberOp === "+"
            ? original + numberShift
            : numberOp === "-"
                ? original - numberShift
                : numberOp === "*"
                    ? original * numberShift
                    : original / numberShift;

        numberPath.replaceWith(
            t.callExpression(t.identifier(numberDecoderName), [
                t.numericLiteral(encoded),
                t.numericLiteral(opToken),
            ]) as unknown as BabelNode,
        );

        numberCount++;
    }

    let booleanCount = 0;

    traverse(ast, {
        BooleanLiteral(pathNode: BabelNodePath) {
            if (!pathNode.node || typeof pathNode.node.value !== "boolean") {
                return;
            }

            const marker = pathNode.node.value ? trueToken : falseToken;

            pathNode.replaceWith(
                t.callExpression(t.identifier(boolDecoderName), [
                    t.numericLiteral(marker),
                ]) as unknown as BabelNode,
            );

            booleanCount++;
        },
    });

    const helperNodes = buildRuntimeHelpers(
        stringTableName,
        stringAccessorName,
        stringDecoderName,
        encodedStringTable,
        stringXorKey,
        numberDecoderName,
        numberFamily,
        numberShift,
        boolDecoderName,
        trueToken,
    );

    return {
        helperNodes,
        stringCount: stringLiteralPaths.length,
        numberCount,
        booleanCount,
    };
}

function chunkEncodedString(input: string): string[] {
    if (input.length === 0) {
        return [""];
    }

    const chunks: string[] = [];

    for (let i = 0; i < input.length; i += 3) {
        chunks.push(input.slice(i, i + 3));
    }

    return chunks;
}

function pickNumberOperator(family: NumberOperatorFamily): NumberOperator {
    if (family === "additive") {
        return crypto.randomInt(0, 2) === 0 ? "+" : "-";
    }

    return "*";
}

function encodeNumberOperator(operator: NumberOperator): number {
    switch (operator) {
        case "+":
            return 0;
        case "-":
            return 1;
        case "*":
            return 2;
        case "/":
            return 3;
    }
}
