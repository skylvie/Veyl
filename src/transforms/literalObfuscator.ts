import type { NumberObfuscationOperator, ObfuscationConfig } from "../types/config.js";
import type { LiteralObfuscationResult } from "../types/transforms.js";
import type { BabelNode, BabelNodePath } from "../types/babel.js";
import type { NameGenerator } from "../utils/random.js";
import { traverse } from "../babel/interop.js";
import { isDirectiveLiteral, isModuleStringLiteral, isPropertyKeyNode } from "../babel/predicates.js";
import { buildRuntimeHelpers } from "../runtime/index.js";
import { encodeStringLiteralValue, randomAsciiString } from "../utils/random.js";
import * as t from "@babel/types";
import crypto from "node:crypto";


const ADDITIVE_NUMBER_SHIFT_MIN = 100_000;
const ADDITIVE_NUMBER_SHIFT_MAX = 999_999;
const MULTIPLICATIVE_NUMBER_SHIFT_MIN = 100;
const MULTIPLICATIVE_NUMBER_SHIFT_MAX = 999;
const ADDITIVE_NUMBER_OPERATORS: readonly NumberObfuscationOperator[] = ["+", "-"];
const MULTIPLICATIVE_NUMBER_OPERATORS: readonly NumberObfuscationOperator[] = ["*", "/"];

// Replaces string, number, and boolean literals with runtime decoder calls
export function obfuscateLiterals(
    ast: object,
    names: NameGenerator,
    config: ObfuscationConfig,
): LiteralObfuscationResult {
    const runtimeOptions: Parameters<typeof buildRuntimeHelpers>[0] = {};
    let stringCount = 0;
    let numberCount = 0;
    let booleanCount = 0;
    let booleanNumber: number | null = null;
    let numberOffset: number | null = null;
    const numberOperators = new Set<NumberObfuscationOperator>();

    if (config.features.obfuscate.strings) {
        const stringTableName = names.freshIdentifier();
        const stringAccessorName = names.freshIdentifier();
        const stringDecoderName = names.freshIdentifier();
        const stringXorKey = crypto.randomInt(1, 256);
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

        runtimeOptions.strings = {
            tableName: stringTableName,
            accessorName: stringAccessorName,
            decoderName: stringDecoderName,
            encodedTable: encodedStringTable,
            xorKey: stringXorKey,
        };
        stringCount = stringLiteralPaths.length;
    }

    if (config.features.obfuscate.numbers) {
        const numberDecoderName = names.freshIdentifier();
        const allowedOperators = config.options.number_operator === null
            ? pickNumberOperatorFamily()
            : [config.options.number_operator];
        numberOffset = config.options.number_offset ?? randomNumberOffset(allowedOperators);
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

        for (const numberPath of numericLiteralPaths) {
            const original = numberPath.node?.value;

            if (typeof original !== "number") {
                continue;
            }

            const numberOp = pickNumberOperator(allowedOperators);
            const opToken = encodeNumberOperator(numberOp);
            const encoded = encodeNumber(original, numberOp, numberOffset);

            numberPath.replaceWith(
                t.callExpression(t.identifier(numberDecoderName), [
                    t.numericLiteral(encoded),
                    t.numericLiteral(opToken),
                ]) as unknown as BabelNode,
            );

            numberCount++;
        }

        runtimeOptions.numbers = {
            decoderName: numberDecoderName,
            allowedOperators,
            offset: numberOffset,
        };

        if (numberCount > 0) {
            for (const operator of allowedOperators) {
                numberOperators.add(operator);
            }
        }
    }

    if (config.features.obfuscate.booleans) {
        const boolDecoderName = names.freshIdentifier();
        const trueToken = config.options.boolean_number ?? crypto.randomInt(10000, 99999);
        let falseToken = crypto.randomInt(10000, 99999);

        booleanNumber = trueToken;

        while (falseToken === trueToken) {
            falseToken = crypto.randomInt(10000, 99999);
        }

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

        runtimeOptions.booleans = {
            decoderName: boolDecoderName,
            trueToken,
        };
    }

    const helperNodes = buildRuntimeHelpers(runtimeOptions);

    return {
        helperNodes,
        stringCount,
        numberCount,
        booleanCount,
        booleanNumber,
        numberOffset,
        numberOperators: [...numberOperators],
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

function pickNumberOperator(operators: readonly NumberObfuscationOperator[]): NumberObfuscationOperator {
    return operators[crypto.randomInt(0, operators.length)];
}

function pickNumberOperatorFamily(): readonly NumberObfuscationOperator[] {
    return crypto.randomInt(0, 2) === 0
        ? ADDITIVE_NUMBER_OPERATORS
        : MULTIPLICATIVE_NUMBER_OPERATORS;
}

function encodeNumber(original: number, operator: NumberObfuscationOperator, offset: number): number {
    switch (operator) {
        case "+":
            return original + offset;
        case "-":
            return original - offset;
        case "*":
            return original * offset;
        case "/":
            return original / offset;
    }
}

function randomNumberOffset(operators: readonly NumberObfuscationOperator[]): number {
    if (operators.includes("/")) {
        return 2 ** crypto.randomInt(1, 11);
    }

    if (operators.includes("*")) {
        return crypto.randomInt(MULTIPLICATIVE_NUMBER_SHIFT_MIN, MULTIPLICATIVE_NUMBER_SHIFT_MAX + 1);
    }

    if (operators.includes("+") || operators.includes("-")) {
        return crypto.randomInt(ADDITIVE_NUMBER_SHIFT_MIN, ADDITIVE_NUMBER_SHIFT_MAX + 1);
    }

    return 2;
}

function encodeNumberOperator(operator: NumberObfuscationOperator): number {
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
