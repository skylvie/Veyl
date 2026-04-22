import fs from "node:fs";
import path from "node:path";
import { DEFAULT_CONFIG_FILE } from "./defaults.js";
import {
    isBooleanObfuscationMethod,
    isLogLevel,
    isNumberObfuscationMethod,
    isNumberObfuscationOperatorFamily,
    isPlainObject,
    isStringObfuscationMethod,
} from "./guards.js";
import type {
    BooleanObfuscationMethod,
    LogLevel,
    NumberObfuscationMethod,
    NumberObfuscationOperatorFamily,
    ObfuscationConfigInput,
    StringObfuscationMethod,
} from "./types.js";

export function loadConfigFile(configPath: string): ObfuscationConfigInput {
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed: unknown = JSON.parse(raw);

    if (!isPlainObject(parsed)) {
        throw new Error(`Config file must contain a JSON object: ${configPath}`);
    }

    assertNoUnknownKeys(parsed, ["log_level", "minify", "obfuscate", "features"], "config");

    const obfuscate = readObject(parsed, "obfuscate");
    const strings = obfuscate === undefined ? undefined : readObject(obfuscate, "strings");
    const numbers = obfuscate === undefined ? undefined : readObject(obfuscate, "numbers");
    const booleans = obfuscate === undefined ? undefined : readObject(obfuscate, "booleans");
    const features = readObject(parsed, "features");
    const encryption = features === undefined ? undefined : readObject(features, "encryption");

    assertNoUnknownKeys(obfuscate, ["strings", "numbers", "booleans"], "obfuscate");
    assertNoUnknownKeys(
        strings,
        ["enabled", "encode", "unicode_escape_sequence", "method", "split_length"],
        "obfuscate.strings"
    );
    assertNoUnknownKeys(numbers, ["enabled", "method", "offset", "operator"], "obfuscate.numbers");
    assertNoUnknownKeys(booleans, ["enabled", "method", "number", "depth"], "obfuscate.booleans");
    assertNoUnknownKeys(
        features,
        [
            "randomized_unique_identifiers",
            "unnecessary_depth",
            "dead_code_injection",
            "control_flow_flattening",
            "simplify",
            "functionify",
            "evalify",
            "node_vm",
            "encryption",
        ],
        "features"
    );
    assertNoUnknownKeys(encryption, ["public_key", "private_key"], "features.encryption");

    return {
        log_level: readOptionalLogLevel(parsed, "log_level", "log_level"),
        minify: readOptionalBoolean(parsed, "minify", "minify"),
        obfuscate: {
            strings: {
                enabled: readOptionalBoolean(strings, "enabled", "obfuscate.strings.enabled"),
                encode: readOptionalBoolean(strings, "encode", "obfuscate.strings.encode"),
                unicode_escape_sequence: readOptionalBoolean(
                    strings,
                    "unicode_escape_sequence",
                    "obfuscate.strings.unicode_escape_sequence"
                ),
                method: readOptionalStringMethod(strings, "method", "obfuscate.strings.method"),
                split_length: readOptionalPositiveInteger(
                    strings,
                    "split_length",
                    "obfuscate.strings.split_length"
                ),
            },
            numbers: {
                enabled: readOptionalBoolean(numbers, "enabled", "obfuscate.numbers.enabled"),
                method: readOptionalNumberMethod(numbers, "method", "obfuscate.numbers.method"),
                offset: readOptionalNumberOrNull(numbers, "offset", "obfuscate.numbers.offset"),
                operator: readOptionalNumberOperatorFamily(
                    numbers,
                    "operator",
                    "obfuscate.numbers.operator"
                ),
            },
            booleans: {
                enabled: readOptionalBoolean(booleans, "enabled", "obfuscate.booleans.enabled"),
                method: readOptionalBooleanMethod(booleans, "method", "obfuscate.booleans.method"),
                number: readOptionalNumberOrNull(booleans, "number", "obfuscate.booleans.number"),
                depth: readOptionalBooleanDepth(booleans, "depth", "obfuscate.booleans.depth"),
            },
        },
        features: {
            randomized_unique_identifiers: readOptionalBoolean(
                features,
                "randomized_unique_identifiers",
                "features.randomized_unique_identifiers"
            ),
            unnecessary_depth: readOptionalBoolean(
                features,
                "unnecessary_depth",
                "features.unnecessary_depth"
            ),
            dead_code_injection: readOptionalBoolean(
                features,
                "dead_code_injection",
                "features.dead_code_injection"
            ),
            control_flow_flattening: readOptionalBoolean(
                features,
                "control_flow_flattening",
                "features.control_flow_flattening"
            ),
            simplify: readOptionalBoolean(features, "simplify", "features.simplify"),
            functionify: readOptionalBoolean(features, "functionify", "features.functionify"),
            evalify: readOptionalBoolean(features, "evalify", "features.evalify"),
            node_vm: readOptionalBoolean(features, "node_vm", "features.node_vm"),
            encryption: {
                public_key: readOptionalStringOrNull(
                    encryption,
                    "public_key",
                    "features.encryption.public_key"
                ),
                private_key: readOptionalStringOrNull(
                    encryption,
                    "private_key",
                    "features.encryption.private_key"
                ),
            },
        },
    };
}

export function loadDefaultConfigFile(cwd: string): ObfuscationConfigInput {
    const configPath = path.resolve(cwd, DEFAULT_CONFIG_FILE);

    if (!fs.existsSync(configPath)) {
        return {};
    }

    return loadConfigFile(configPath);
}

function readObject(input: unknown, key: string): Record<string, unknown> | undefined {
    if (!isPlainObject(input)) {
        return undefined;
    }

    const value = input[key];

    if (value === undefined) {
        return undefined;
    }

    if (!isPlainObject(value)) {
        throw new Error(`${key} must be an object`);
    }

    return value;
}

function assertNoUnknownKeys(
    input: Record<string, unknown> | undefined,
    allowedKeys: string[],
    label: string
): void {
    if (input === undefined) {
        return;
    }

    for (const key of Object.keys(input)) {
        if (!allowedKeys.includes(key)) {
            throw new Error(`Unknown config option: ${label}.${key}`);
        }
    }
}

function readOptionalBoolean(
    input: Record<string, unknown> | undefined,
    key: string,
    label: string
): boolean | undefined {
    if (input === undefined || input[key] === undefined) {
        return undefined;
    }

    if (typeof input[key] !== "boolean") {
        throw new Error(`${label} must be true or false`);
    }

    return input[key];
}

function readOptionalLogLevel(
    input: Record<string, unknown>,
    key: string,
    label: string
): LogLevel | undefined {
    if (input[key] === undefined) {
        return undefined;
    }

    if (isLogLevel(input[key])) {
        return input[key];
    }

    throw new Error(`${label} must be one of none, error, info, or debug`);
}

function readOptionalNumberOrNull(
    input: Record<string, unknown> | undefined,
    key: string,
    label: string
): number | null | undefined {
    if (input === undefined || input[key] === undefined) {
        return undefined;
    }

    if (input[key] === null || input[key] === "randomized") {
        return null;
    }

    if (typeof input[key] !== "number") {
        throw new Error(`${label} must be a number, null, or "randomized"`);
    }

    return input[key];
}

function readOptionalStringOrNull(
    input: Record<string, unknown> | undefined,
    key: string,
    label: string
): string | null | undefined {
    if (input === undefined || input[key] === undefined) {
        return undefined;
    }

    if (input[key] === null) {
        return null;
    }

    if (typeof input[key] !== "string") {
        throw new Error(`${label} must be a string path or null`);
    }

    return input[key];
}

function readOptionalNumberOperatorFamily(
    input: Record<string, unknown> | undefined,
    key: string,
    label: string
): NumberObfuscationOperatorFamily | null | undefined {
    if (input === undefined || input[key] === undefined) {
        return undefined;
    }

    if (input[key] === null || input[key] === "randomized") {
        return null;
    }

    if (isNumberObfuscationOperatorFamily(input[key])) {
        return input[key];
    }

    throw new Error(`${label} must be one of "+-", "*/", null, or "randomized"`);
}

function readOptionalNumberMethod(
    input: Record<string, unknown> | undefined,
    key: string,
    label: string
): NumberObfuscationMethod | undefined {
    if (input === undefined || input[key] === undefined) {
        return undefined;
    }

    if (isNumberObfuscationMethod(input[key])) {
        return input[key];
    }

    throw new Error(`${label} must be "offset" or "equation"`);
}

function readOptionalStringMethod(
    input: Record<string, unknown> | undefined,
    key: string,
    label: string
): StringObfuscationMethod | undefined {
    if (input === undefined || input[key] === undefined) {
        return undefined;
    }

    if (isStringObfuscationMethod(input[key])) {
        return input[key];
    }

    throw new Error(`${label} must be "array" or "split"`);
}

function readOptionalBooleanMethod(
    input: Record<string, unknown> | undefined,
    key: string,
    label: string
): BooleanObfuscationMethod | undefined {
    if (input === undefined || input[key] === undefined) {
        return undefined;
    }

    if (isBooleanObfuscationMethod(input[key])) {
        return input[key];
    }

    throw new Error(`${label} must be "number" or "depth"`);
}

function readOptionalBooleanDepth(
    input: Record<string, unknown> | undefined,
    key: string,
    label: string
): number | "randomized" | null | undefined {
    if (input === undefined || input[key] === undefined) {
        return undefined;
    }

    if (input[key] === null) {
        return null;
    }

    if (input[key] === "randomized") {
        return "randomized";
    }

    if (!Number.isInteger(input[key]) || (input[key] as number) <= 0) {
        throw new Error(`${label} must be a positive integer, null, or "randomized"`);
    }

    return input[key] as number;
}

function readOptionalPositiveInteger(
    input: Record<string, unknown> | undefined,
    key: string,
    label: string
): number | undefined {
    if (input === undefined || input[key] === undefined) {
        return undefined;
    }

    if (typeof input[key] !== "number" || !Number.isInteger(input[key]) || input[key] <= 0) {
        throw new Error(`${label} must be a positive integer`);
    }

    return input[key];
}
