import * as t from "@babel/types";
import type { StringObfuscationMethod } from "@skylvi/veyl-config";
import type { RuntimeHelperOptions } from "../../types/runtime.js";
import { randomInt } from "../../utils/platform.js";
import { encodeStringLiteralValue, type NameGenerator } from "../../utils/random.js";
import { createStringLiteralNode } from "../../utils/stringLiteral.js";

interface WrappedBodyStringConfig {
    obfuscate: {
        strings: {
            method: StringObfuscationMethod;
            split_length: number;
            encode: boolean;
            unicode_escape_sequence: boolean;
        };
    };
}

export function addWrappedBodyString(
    runtimeOptions: RuntimeHelperOptions,
    names: NameGenerator,
    bodyCode: string,
    config: WrappedBodyStringConfig
): t.Expression {
    ensureWrappedBodyStringRuntime(runtimeOptions, names, config);

    if (runtimeOptions.strings?.method === "split") {
        return buildSplitStringExpression(
            runtimeOptions.strings.decoderName,
            bodyCode,
            runtimeOptions.strings.xorKey,
            config.obfuscate.strings.split_length,
            runtimeOptions.strings.encode,
            runtimeOptions.strings.unicodeEscapeSequence
        );
    }

    const stringRuntime = runtimeOptions.strings;

    if (stringRuntime === undefined) {
        throw new Error("wrapped body string runtime was not initialized");
    }

    const encodedTable = stringRuntime?.encodedTable;
    const orderTable = stringRuntime?.orderTable;
    const accessorName = stringRuntime?.accessorName;

    if (accessorName === undefined || encodedTable === undefined || orderTable === undefined) {
        throw new Error("array string obfuscation requires string table state");
    }

    const tableIndex = encodedTable.length;
    const shuffledParts = shuffleStringParts(splitStringForArrayTable(bodyCode));

    encodedTable.push(
        shuffledParts.parts.map((part) =>
            stringRuntime.encode ? encodeStringLiteralValue(part, stringRuntime.xorKey) : part
        )
    );
    orderTable.push(shuffledParts.order);

    return t.callExpression(t.identifier(accessorName), [t.numericLiteral(tableIndex)]);
}

export function ensureWrappedBodyStringRuntime(
    runtimeOptions: RuntimeHelperOptions,
    names: NameGenerator,
    config: WrappedBodyStringConfig
): void {
    if (runtimeOptions.strings === undefined) {
        runtimeOptions.strings = {
            method: config.obfuscate.strings.method,
            decoderName: names.freshIdentifier(),
            encode: config.obfuscate.strings.encode,
            unicodeEscapeSequence: config.obfuscate.strings.unicode_escape_sequence,
            xorKey: randomInt(1, 256),
        };

        if (config.obfuscate.strings.method === "array") {
            runtimeOptions.strings.tableName = names.freshIdentifier();
            runtimeOptions.strings.orderTableName = names.freshIdentifier();
            runtimeOptions.strings.accessorName = names.freshIdentifier();
            runtimeOptions.strings.encodedTable = [];
            runtimeOptions.strings.orderTable = [];
        }
    }
}

function buildSplitStringExpression(
    stringDecoderName: string,
    literalValue: string,
    stringXorKey: number,
    stringSplitLength: number,
    encode: boolean,
    unicodeEscapeSequence: boolean
): t.Expression {
    const parts = splitPlainString(literalValue, stringSplitLength).map((chunk) =>
        encode
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
