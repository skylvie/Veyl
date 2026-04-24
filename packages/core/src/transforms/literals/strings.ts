import * as t from "@babel/types";
import type { ObfuscationConfig, StringObfuscationMethod } from "@skylvi/veyl-config";
import { traverse } from "../../babel/interop.js";
import {
    isDirectiveLiteral,
    isModuleStringLiteral,
    isPropertyKeyNode,
} from "../../babel/predicates.js";
import type { BabelNode, BabelNodePath } from "../../types/babel.js";
import type { LiteralObfuscationResult } from "../../types/transforms.js";
import { randomInt } from "../../utils/platform.js";
import type { NameGenerator } from "../../utils/random.js";
import { encodeStringLiteralValue } from "../../utils/random.js";
import { createStringLiteralNode } from "../../utils/stringLiteral.js";

interface StringTableState {
    encodedTable: string[][];
    orderTable: number[][];
    availableIndices: number[];
}

export function obfuscateStringLiterals(
    ast: object,
    names: NameGenerator,
    config: ObfuscationConfig,
    runtimeOptions: LiteralObfuscationResult["runtimeOptions"]
): number {
    const stringObfuscationEnabled = config.obfuscate.strings.enabled;
    const unicodeEscapeSequence = config.obfuscate.strings.unicode_escape_sequence;

    if (!stringObfuscationEnabled && !unicodeEscapeSequence) {
        return 0;
    }

    const stringDecoderName = names.freshIdentifier();
    const stringXorKey = randomInt(1, 256);
    const stringEncode = config.obfuscate.strings.encode;
    const stringMethod = stringObfuscationEnabled ? config.obfuscate.strings.method : null;
    const stringSplitLength = config.obfuscate.strings.split_length;
    const stringTableName = stringMethod === "array" ? names.freshIdentifier() : undefined;
    const stringOrderTableName = stringMethod === "array" ? names.freshIdentifier() : undefined;
    const stringAccessorName = stringMethod === "array" ? names.freshIdentifier() : undefined;
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

            if (pathNode.parent?.type === "TaggedTemplateExpression" && pathNode.key === "quasi") {
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
                stringTableState,
                unicodeEscapeSequence
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
            stringTableState,
            unicodeEscapeSequence
        );

        templatePath.replaceWith(replacement as unknown as BabelNode);
    }

    if (totalStringEntries > 0 && stringObfuscationEnabled) {
        runtimeOptions.strings = {
            method: stringMethod ?? "array",
            decoderName: stringDecoderName,
            encode: stringEncode,
            unicodeEscapeSequence,
            xorKey: stringXorKey,
        };

        if (stringTableState !== null) {
            runtimeOptions.strings.tableName = stringTableName;
            runtimeOptions.strings.orderTableName = stringOrderTableName;
            runtimeOptions.strings.accessorName = stringAccessorName;
            runtimeOptions.strings.encodedTable = stringTableState.encodedTable;
            runtimeOptions.strings.orderTable = stringTableState.orderTable;
        }
    }

    return totalStringEntries;
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
    stringMethod: StringObfuscationMethod | null,
    stringDecoderName: string,
    stringAccessorName: string | undefined,
    stringXorKey: number,
    stringEncode: boolean,
    stringSplitLength: number,
    stringTableState: StringTableState | null,
    unicodeEscapeSequence: boolean
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
            stringTableState,
            unicodeEscapeSequence
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
                stringTableState,
                unicodeEscapeSequence
            )
        );

        if (i < node.expressions.length) {
            parts.push(node.expressions[i] as t.Expression);
        }
    }

    let output: t.Expression = parts[0] ?? createStringLiteralNode("", unicodeEscapeSequence);

    for (let i = 1; i < parts.length; i++) {
        output = t.binaryExpression("+", output, parts[i]);
    }

    return output;
}

function buildStringObfuscatedExpression(
    stringMethod: StringObfuscationMethod | null,
    stringDecoderName: string,
    stringAccessorName: string | undefined,
    literalValue: string,
    stringXorKey: number,
    stringEncode: boolean,
    stringSplitLength: number,
    stringTableState: StringTableState | null,
    unicodeEscapeSequence: boolean
): t.Expression {
    if (stringMethod === null) {
        return createStringLiteralNode(literalValue, unicodeEscapeSequence);
    }

    if (stringMethod === "split") {
        return buildSplitStringExpression(
            stringDecoderName,
            literalValue,
            stringXorKey,
            stringEncode,
            stringSplitLength,
            unicodeEscapeSequence
        );
    }

    if (stringAccessorName === undefined || stringTableState === null) {
        throw new Error("array string obfuscation requires string table state");
    }

    const pickAt = randomInt(0, stringTableState.availableIndices.length);
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
    stringSplitLength: number,
    unicodeEscapeSequence: boolean
): t.Expression {
    const literalChunks = splitPlainString(literalValue, stringSplitLength);
    const parts = literalChunks.map((chunk) =>
        stringEncode
            ? t.callExpression(t.identifier(stringDecoderName), [
                  createStringLiteralNode(
                      encodeStringLiteralValue(chunk, stringXorKey),
                      unicodeEscapeSequence
                  ),
              ])
            : createStringLiteralNode(chunk, unicodeEscapeSequence)
    );

    let output: t.Expression = parts[0] ?? createStringLiteralNode("", unicodeEscapeSequence);

    for (let i = 1; i < parts.length; i++) {
        output = t.binaryExpression("+", output, parts[i]);
    }

    return output;
}

function createStringTableState(size: number): StringTableState {
    return {
        encodedTable: new Array<string[]>(size),
        orderTable: new Array<number[]>(size),
        availableIndices: Array.from({ length: size }, (_, idx) => idx),
    };
}

function splitStringForArrayTable(input: string): string[] {
    return input.split(" ");
}

function shuffleStringParts(parts: string[]): { parts: string[]; order: number[] } {
    const shuffled = parts.map((value, index) => ({ value, index }));

    for (let i = shuffled.length - 1; i > 0; i--) {
        const pickAt = randomInt(0, i + 1);
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
