import crypto from "node:crypto";
import * as t from "@babel/types";
import type {
    NumberObfuscationOperator,
    NumberObfuscationOperatorFamily,
    ObfuscationConfig,
    StringObfuscationMethod,
} from "@skylvi/veyl-config";
import { traverse } from "../babel/interop.js";
import {
    isDirectiveLiteral,
    isModuleStringLiteral,
    isPropertyKeyNode,
} from "../babel/predicates.js";
import type { BabelNode, BabelNodePath } from "../types/babel.js";
import type { LiteralObfuscationResult } from "../types/transforms.js";
import type { NameGenerator } from "../utils/random.js";
import { encodeStringLiteralValue } from "../utils/random.js";

const ADDITIVE_NUMBER_SHIFT_MIN = 100_000;
const ADDITIVE_NUMBER_SHIFT_MAX = 999_999;
const MULTIPLICATIVE_NUMBER_SHIFT_MIN = 100;
const MULTIPLICATIVE_NUMBER_SHIFT_MAX = 999;
const ADDITIVE_NUMBER_OPERATORS: readonly NumberObfuscationOperator[] = ["+", "-"];
const MULTIPLICATIVE_NUMBER_OPERATORS: readonly NumberObfuscationOperator[] = ["*", "/"];

interface StringTableState {
    encodedTable: string[][];
    orderTable: number[][];
    availableIndices: number[];
}

// Replaces string, number, and boolean literals with runtime decoder calls
export function obfuscateLiterals(
    ast: object,
    names: NameGenerator,
    config: ObfuscationConfig
): LiteralObfuscationResult {
    const runtimeOptions: LiteralObfuscationResult["runtimeOptions"] = {};
    let stringCount = 0;
    let numberCount = 0;
    let booleanCount = 0;
    let booleanNumber: number | null = null;
    let numberOffset: number | null = null;
    const numberOperators = new Set<NumberObfuscationOperator>();

    if (config.obfuscate.strings.enabled) {
        const stringDecoderName = names.freshIdentifier();
        const stringXorKey = crypto.randomInt(1, 256);
        const stringEncode = config.obfuscate.strings.encode;
        const stringMethod = config.obfuscate.strings.method;
        const stringSplitLength = config.obfuscate.strings.split_length;
        const stringTableName = stringMethod === "array" ? names.freshIdentifier() : undefined;
        const stringAccessorName =
            stringMethod === "array" ? names.freshIdentifier() : undefined;
        const stringLiteralPaths: BabelNodePath[] = [];
        const templateLiteralPaths: BabelNodePath[] = [];

        traverse(ast, {
            StringLiteral(pathNode: BabelNodePath) {
                if (!pathNode.node || typeof pathNode.node.value !== "string") {
                    return;
                }

                if (
                    isDirectiveLiteral(pathNode) ||
                    isModuleStringLiteral(pathNode) ||
                    isPropertyKeyNode(pathNode)
                ) {
                    return;
                }

                stringLiteralPaths.push(pathNode);
            },
            TemplateLiteral(pathNode: BabelNodePath) {
                if (!pathNode.node) {
                    return;
                }

                if (
                    pathNode.parent?.type === "TaggedTemplateExpression" &&
                    pathNode.key === "quasi"
                ) {
                    return;
                }

                templateLiteralPaths.push(pathNode);
            },
        });

        const templateStringParts = countTemplateStringParts(templateLiteralPaths);
        const totalStringEntries = stringLiteralPaths.length + templateStringParts;
        const stringTableState =
            stringMethod === "array" ? createStringTableState(totalStringEntries) : null;

        for (const literalPath of stringLiteralPaths) {
            const literalValue = literalPath.node?.value;

            if (typeof literalValue !== "string") {
                continue;
            }

            literalPath.replaceWith(
                buildStringObfuscatedExpression(
                    stringMethod,
                    stringDecoderName,
                    stringAccessorName,
                    literalValue,
                    stringXorKey,
                    stringEncode,
                    stringSplitLength,
                    stringTableState
                ) as unknown as BabelNode
            );
        }

        for (const templatePath of templateLiteralPaths) {
            if (!templatePath.node || templatePath.node.type !== "TemplateLiteral") {
                continue;
            }

            const replacement = buildTemplateLiteralReplacement(
                templatePath.node as unknown as t.TemplateLiteral,
                stringMethod,
                stringDecoderName,
                stringAccessorName,
                stringXorKey,
                stringEncode,
                stringSplitLength,
                stringTableState
            );

            templatePath.replaceWith(replacement as unknown as BabelNode);
        }

        stringCount = totalStringEntries;

        if (stringCount > 0) {
            runtimeOptions.strings = {
                method: stringMethod,
                decoderName: stringDecoderName,
                encode: stringEncode,
                xorKey: stringXorKey,
            };

            if (stringTableState !== null) {
                runtimeOptions.strings.tableName = stringTableName;
                runtimeOptions.strings.accessorName = stringAccessorName;
                runtimeOptions.strings.encodedTable = stringTableState.encodedTable;
                runtimeOptions.strings.orderTable = stringTableState.orderTable;
            }
        }
    }

    if (config.obfuscate.numbers.enabled) {
        const numberDecoderName = names.freshIdentifier();
        const allowedOperators = pickNumberOperators(config.obfuscate.numbers.operator);
        const resolvedNumberOffset =
            config.obfuscate.numbers.offset ?? randomNumberOffset(allowedOperators);
        numberOffset = resolvedNumberOffset;
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
            const encoded = encodeNumber(original, numberOp, resolvedNumberOffset);

            numberPath.replaceWith(
                t.callExpression(t.identifier(numberDecoderName), [
                    t.numericLiteral(encoded),
                    t.numericLiteral(opToken),
                ]) as unknown as BabelNode
            );

            numberCount++;
        }

        if (numberCount > 0) {
            runtimeOptions.numbers = {
                decoderName: numberDecoderName,
                allowedOperators,
                offset: resolvedNumberOffset,
            };

            for (const operator of allowedOperators) {
                numberOperators.add(operator);
            }
        }
    }

    if (config.obfuscate.booleans.enabled) {
        const boolDecoderName = names.freshIdentifier();
        const trueToken = config.obfuscate.booleans.number ?? crypto.randomInt(10000, 99999);
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
                    ]) as unknown as BabelNode
                );

                booleanCount++;
            },
        });

        if (booleanCount > 0) {
            runtimeOptions.booleans = {
                decoderName: boolDecoderName,
                trueToken,
            };
        }
    }

    return {
        runtimeOptions,
        stringCount,
        numberCount,
        booleanCount,
        booleanNumber,
        numberOffset,
        numberOperators: [...numberOperators],
    };
}

function countTemplateStringParts(templateLiteralPaths: BabelNodePath[]): number {
    let count = 0;

    for (const templatePath of templateLiteralPaths) {
        if (templatePath.node?.type !== "TemplateLiteral") {
            continue;
        }

        count += (templatePath.node as unknown as t.TemplateLiteral).quasis.length;
    }

    return count;
}

function buildTemplateLiteralReplacement(
    node: t.TemplateLiteral,
    stringMethod: StringObfuscationMethod,
    stringDecoderName: string,
    stringAccessorName: string | undefined,
    stringXorKey: number,
    stringEncode: boolean,
    stringSplitLength: number,
    stringTableState: StringTableState | null
): t.Expression {
    if (node.expressions.length === 0) {
        return buildStringObfuscatedExpression(
            stringMethod,
            stringDecoderName,
            stringAccessorName,
            node.quasis[0]?.value.cooked ?? "",
            stringXorKey,
            stringEncode,
            stringSplitLength,
            stringTableState
        );
    }

    const parts: t.Expression[] = [];

    for (let i = 0; i < node.quasis.length; i++) {
        parts.push(
            buildStringObfuscatedExpression(
                stringMethod,
                stringDecoderName,
                stringAccessorName,
                node.quasis[i]?.value.cooked ?? "",
                stringXorKey,
                stringEncode,
                stringSplitLength,
                stringTableState
            )
        );

        if (i < node.expressions.length) {
            parts.push(node.expressions[i] as t.Expression);
        }
    }

    let output: t.Expression = parts[0] ?? t.stringLiteral("");

    for (let i = 1; i < parts.length; i++) {
        output = t.binaryExpression("+", output, parts[i]);
    }

    return output;
}

function buildStringObfuscatedExpression(
    stringMethod: StringObfuscationMethod,
    stringDecoderName: string,
    stringAccessorName: string | undefined,
    literalValue: string,
    stringXorKey: number,
    stringEncode: boolean,
    stringSplitLength: number,
    stringTableState: StringTableState | null
): t.Expression {
    if (stringMethod === "split") {
        return buildSplitStringExpression(
            stringDecoderName,
            literalValue,
            stringXorKey,
            stringEncode,
            stringSplitLength
        );
    }

    if (stringAccessorName === undefined || stringTableState === null) {
        throw new Error("array string obfuscation requires string table state");
    }

    const pickAt = crypto.randomInt(0, stringTableState.availableIndices.length);
    const tableIndex = stringTableState.availableIndices[pickAt];

    stringTableState.availableIndices.splice(pickAt, 1);
    const shuffledParts = shuffleStringParts(splitStringForArrayTable(literalValue));

    stringTableState.encodedTable[tableIndex] = shuffledParts.parts.map((part) =>
        stringEncode ? encodeStringLiteralValue(part, stringXorKey) : part
    );
    stringTableState.orderTable[tableIndex] = shuffledParts.order;

    return t.callExpression(t.identifier(stringAccessorName), [t.numericLiteral(tableIndex)]);
}

function buildSplitStringExpression(
    stringDecoderName: string,
    literalValue: string,
    stringXorKey: number,
    stringEncode: boolean,
    stringSplitLength: number
): t.Expression {
    const literalChunks = splitPlainString(literalValue, stringSplitLength);
    const parts = literalChunks.map((chunk) =>
        stringEncode
            ? t.callExpression(t.identifier(stringDecoderName), [
                  t.stringLiteral(encodeStringLiteralValue(chunk, stringXorKey)),
              ])
            : t.stringLiteral(chunk)
    );

    let output: t.Expression = parts[0] ?? t.stringLiteral("");

    for (let i = 1; i < parts.length; i++) {
        output = t.binaryExpression("+", output, parts[i]);
    }

    return output;
}

function createStringTableState(size: number): StringTableState {
    const encodedTable = new Array<string[]>(size);
    const orderTable = new Array<number[]>(size);
    const availableIndices = Array.from({ length: size }, (_, idx) => idx);

    return {
        encodedTable,
        orderTable,
        availableIndices,
    };
}

function splitStringForArrayTable(input: string): string[] {
    return input.split(" ");
}

function shuffleStringParts(parts: string[]): { parts: string[]; order: number[] } {
    const shuffled = parts.map((value, index) => ({ value, index }));

    for (let i = shuffled.length - 1; i > 0; i--) {
        const pickAt = crypto.randomInt(0, i + 1);
        const current = shuffled[i];
        shuffled[i] = shuffled[pickAt] as { value: string; index: number };
        shuffled[pickAt] = current as { value: string; index: number };
    }

    return {
        parts: shuffled.map((entry) => entry.value),
        order: shuffled.map((entry) => entry.index),
    };
}

function splitPlainString(input: string, splitLength: number): string[] {
    if (input.length === 0) {
        return [""];
    }

    const chunks: string[] = [];

    for (let i = 0; i < input.length; i += splitLength) {
        chunks.push(input.slice(i, i + splitLength));
    }

    return chunks;
}

function pickNumberOperator(
    operators: readonly NumberObfuscationOperator[]
): NumberObfuscationOperator {
    return operators[crypto.randomInt(0, operators.length)];
}

function pickNumberOperatorFamily(): readonly NumberObfuscationOperator[] {
    return crypto.randomInt(0, 2) === 0
        ? ADDITIVE_NUMBER_OPERATORS
        : MULTIPLICATIVE_NUMBER_OPERATORS;
}

function pickNumberOperators(
    family: NumberObfuscationOperatorFamily | null
): readonly NumberObfuscationOperator[] {
    if (family === null) {
        return pickNumberOperatorFamily();
    }

    return family === "+-" ? ADDITIVE_NUMBER_OPERATORS : MULTIPLICATIVE_NUMBER_OPERATORS;
}

function encodeNumber(
    original: number,
    operator: NumberObfuscationOperator,
    offset: number
): number {
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

    throw new Error(`Unsupported number operator: ${operator}`);
}

function randomNumberOffset(operators: readonly NumberObfuscationOperator[]): number {
    if (operators.includes("/")) {
        return 2 ** crypto.randomInt(1, 11);
    }

    if (operators.includes("*")) {
        return crypto.randomInt(
            MULTIPLICATIVE_NUMBER_SHIFT_MIN,
            MULTIPLICATIVE_NUMBER_SHIFT_MAX + 1
        );
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

    throw new Error(`Unsupported number operator: ${operator}`);
}
