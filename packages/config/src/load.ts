import fs from "node:fs";
import path from "node:path";
import { DEFAULT_CONFIG_FILE } from "./defaults.js";
import {
    isLogLevel,
    isNumberObfuscationOperatorFamily,
    isPlainObject,
    isStringObfuscationMethod,
} from "./guards.js";
import type {
    LogLevel,
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

    assertNoUnknownKeys(obfuscate, ["strings", "numbers", "booleans"], "obfuscate");
    assertNoUnknownKeys(
        strings,
        ["enabled", "encode", "method", "split_length"],
        "obfuscate.strings"
    );
    assertNoUnknownKeys(numbers, ["enabled", "offset", "operator"], "obfuscate.numbers");
    assertNoUnknownKeys(booleans, ["enabled", "number"], "obfuscate.booleans");
    assertNoUnknownKeys(
        features,
        [
            "randomized_unique_identifiers",
            "unnecessary_depth",
            "dead_code_injection",
            "control_flow_flattening",
            "simplify",
            "functionify",
        ],
        "features"
    );

    return {
        log_level: readOptionalLogLevel(parsed, "log_level", "log_level"),
        minify: readOptionalBoolean(parsed, "minify", "minify"),
        obfuscate: {
            strings: {
                enabled: readOptionalBoolean(strings, "enabled", "obfuscate.strings.enabled"),
                encode: readOptionalBoolean(strings, "encode", "obfuscate.strings.encode"),
                method: readOptionalStringMethod(strings, "method", "obfuscate.strings.method"),
                split_length: readOptionalPositiveInteger(
                    strings,
                    "split_length",
                    "obfuscate.strings.split_length"
                ),
            },
            numbers: {
                enabled: readOptionalBoolean(numbers, "enabled", "obfuscate.numbers.enabled"),
                offset: readOptionalNumberOrNull(numbers, "offset", "obfuscate.numbers.offset"),
                operator: readOptionalNumberOperatorFamily(
                    numbers,
                    "operator",
                    "obfuscate.numbers.operator"
                ),
            },
            booleans: {
                enabled: readOptionalBoolean(booleans, "enabled", "obfuscate.booleans.enabled"),
                number: readOptionalNumberOrNull(booleans, "number", "obfuscate.booleans.number"),
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
