import fs from "node:fs";
import path from "node:path";
import type {
    LogLevel,
    NumberObfuscationOperator,
    ObfuscationConfigInput,
} from "../types/config.js";
import { DEFAULT_CONFIG_FILE } from "./defaults.js";
import { isLogLevel, isNumberObfuscationOperator, isPlainObject } from "./guards.js";

/**
 * Reads and validates a Veyl JSON config file from disk.
 *
 * The returned object is still partial; pass it to `resolveConfig` to fill
 * defaults.
 */
export function loadConfigFile(configPath: string): ObfuscationConfigInput {
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed: unknown = JSON.parse(raw);

    if (!isPlainObject(parsed)) {
        throw new Error(`Config file must contain a JSON object: ${configPath}`);
    }

    assertNoUnknownKeys(parsed, ["log_level", "features", "options"], "config");

    const features = readObject(parsed, "features");
    const obfuscate = features === undefined ? undefined : readObject(features, "obfuscate");
    const options = readObject(parsed, "options");

    assertNoUnknownKeys(
        features,
        ["obfuscate", "randomized_unique_identifiers", "unnecessary_depth"],
        "features"
    );
    assertNoUnknownKeys(obfuscate, ["strings", "numbers", "booleans"], "features.obfuscate");
    assertNoUnknownKeys(
        options,
        ["minify", "boolean_number", "number_offset", "number_operator"],
        "options"
    );

    return {
        log_level: readOptionalLogLevel(parsed, "log_level", "log_level"),
        features: {
            obfuscate: {
                strings: readOptionalBoolean(obfuscate, "strings", "features.obfuscate.strings"),
                numbers: readOptionalBoolean(obfuscate, "numbers", "features.obfuscate.numbers"),
                booleans: readOptionalBoolean(obfuscate, "booleans", "features.obfuscate.booleans"),
            },
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
        },
        options: {
            minify: readOptionalBoolean(options, "minify", "options.minify"),
            boolean_number: readOptionalNumberOrNull(
                options,
                "boolean_number",
                "options.boolean_number"
            ),
            number_offset: readOptionalNumberOrNull(
                options,
                "number_offset",
                "options.number_offset"
            ),
            number_operator: readOptionalNumberOperator(
                options,
                "number_operator",
                "options.number_operator"
            ),
        },
    };
}

/**
 * Reads `veyl_config.json` from `cwd` when present.
 *
 * Returns an empty config object when the default file does not exist.
 */
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

function readOptionalNumberOperator(
    input: Record<string, unknown> | undefined,
    key: string,
    label: string
): NumberObfuscationOperator | null | undefined {
    if (input === undefined || input[key] === undefined) {
        return undefined;
    }

    if (input[key] === null || input[key] === "randomized") {
        return null;
    }

    if (isNumberObfuscationOperator(input[key])) {
        return input[key];
    }

    throw new Error(`${label} must be one of "+", "-", "*", "/", null, or "randomized"`);
}
