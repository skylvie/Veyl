import fs from "node:fs";
import path from "node:path";

export type NumberObfuscationOperator = "+" | "-" | "*" | "/";

export interface ObfuscationConfig {
    features: {
        obfuscate: {
            strings: boolean;
            numbers: boolean;
            booleans: boolean;
        };
        randomized_unique_identifiers: boolean;
        unnecessary_depth: boolean;
    };
    options: {
        boolean_number: number | null;
        number_offset: number | null;
        number_operator: NumberObfuscationOperator | null;
    };
}

export type ObfuscationConfigInput = Partial<{
    features: Partial<{
        obfuscate: Partial<{
            strings: boolean;
            numbers: boolean;
            booleans: boolean;
        }>;
        randomized_unique_identifiers: boolean;
        unnecessary_depth: boolean;
    }>;
    options: Partial<{
        boolean_number: number | null;
        number_offset: number | null;
        number_operator: NumberObfuscationOperator | null;
    }>;
}>;

export const DEFAULT_CONFIG_FILE = "veyl_config.json";

export const DEFAULT_OBFUSCATION_CONFIG: ObfuscationConfig = {
    features: {
        obfuscate: {
            strings: true,
            numbers: true,
            booleans: true,
        },
        randomized_unique_identifiers: true,
        unnecessary_depth: true,
    },
    options: {
        boolean_number: null,
        number_offset: null,
        number_operator: null,
    },
};

export function resolveConfig(input?: ObfuscationConfigInput): ObfuscationConfig {
    const merged: ObfuscationConfig = {
        features: {
            obfuscate: {
                strings: input?.features?.obfuscate?.strings ?? DEFAULT_OBFUSCATION_CONFIG.features.obfuscate.strings,
                numbers: input?.features?.obfuscate?.numbers ?? DEFAULT_OBFUSCATION_CONFIG.features.obfuscate.numbers,
                booleans: input?.features?.obfuscate?.booleans ?? DEFAULT_OBFUSCATION_CONFIG.features.obfuscate.booleans,
            },
            randomized_unique_identifiers: input?.features?.randomized_unique_identifiers ??
                DEFAULT_OBFUSCATION_CONFIG.features.randomized_unique_identifiers,
            unnecessary_depth: input?.features?.unnecessary_depth ?? DEFAULT_OBFUSCATION_CONFIG.features.unnecessary_depth,
        },
        options: {
            boolean_number: input?.options?.boolean_number ?? DEFAULT_OBFUSCATION_CONFIG.options.boolean_number,
            number_offset: input?.options?.number_offset ?? DEFAULT_OBFUSCATION_CONFIG.options.number_offset,
            number_operator: input?.options?.number_operator ?? DEFAULT_OBFUSCATION_CONFIG.options.number_operator,
        },
    };

    validateConfig(merged);

    return merged;
}

export function mergeConfig(
    base: ObfuscationConfigInput,
    override: ObfuscationConfigInput,
): ObfuscationConfigInput {
    return {
        features: {
            obfuscate: {
                ...base.features?.obfuscate,
                ...override.features?.obfuscate,
            },
            randomized_unique_identifiers: override.features?.randomized_unique_identifiers ??
                base.features?.randomized_unique_identifiers,
            unnecessary_depth: override.features?.unnecessary_depth ?? base.features?.unnecessary_depth,
        },
        options: {
            ...base.options,
            ...override.options,
        },
    };
}

export function loadConfigFile(configPath: string): ObfuscationConfigInput {
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed: unknown = JSON.parse(raw);

    if (!isPlainObject(parsed)) {
        throw new Error(`Config file must contain a JSON object: ${configPath}`);
    }

    const features = readObject(parsed, "features");
    const obfuscate = features === undefined ? undefined : readObject(features, "obfuscate");
    const options = readObject(parsed, "options");

    return {
        features: {
            obfuscate: {
                strings: readOptionalBoolean(obfuscate, "strings", "features.obfuscate.strings"),
                numbers: readOptionalBoolean(obfuscate, "numbers", "features.obfuscate.numbers"),
                booleans: readOptionalBoolean(obfuscate, "booleans", "features.obfuscate.booleans"),
            },
            randomized_unique_identifiers: readOptionalBoolean(
                features,
                "randomized_unique_identifiers",
                "features.randomized_unique_identifiers",
            ),
            unnecessary_depth: readOptionalBoolean(features, "unnecessary_depth", "features.unnecessary_depth"),
        },
        options: {
            boolean_number: readOptionalNumberOrNull(options, "boolean_number", "options.boolean_number"),
            number_offset: readOptionalNumberOrNull(options, "number_offset", "options.number_offset"),
            number_operator: readOptionalNumberOperator(options, "number_operator", "options.number_operator"),
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

function validateConfig(config: ObfuscationConfig): void {
    const booleanNumber = config.options.boolean_number;
    const numberOffset = config.options.number_offset;
    const numberOperator = config.options.number_operator;

    if (booleanNumber !== null && !Number.isFinite(booleanNumber)) {
        throw new Error("options.boolean_number must be a finite number");
    }

    if (numberOffset !== null && (!Number.isFinite(numberOffset) || numberOffset === 0)) {
        throw new Error("options.number_offset must be a finite non-zero number");
    }

    if (
        numberOperator !== null &&
        numberOperator !== "+" &&
        numberOperator !== "-" &&
        numberOperator !== "*" &&
        numberOperator !== "/"
    ) {
        throw new Error('options.number_operator must be one of "+", "-", "*", "/", or null');
    }
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

function readOptionalBoolean(
    input: Record<string, unknown> | undefined,
    key: string,
    label: string,
): boolean | undefined {
    if (input === undefined || input[key] === undefined) {
        return undefined;
    }

    if (typeof input[key] !== "boolean") {
        throw new Error(`${label} must be true or false`);
    }

    return input[key];
}

function readOptionalNumberOrNull(
    input: Record<string, unknown> | undefined,
    key: string,
    label: string,
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
    label: string,
): NumberObfuscationOperator | null | undefined {
    if (input === undefined || input[key] === undefined) {
        return undefined;
    }

    if (input[key] === null || input[key] === "randomized") {
        return null;
    }

    if (input[key] === "+" || input[key] === "-" || input[key] === "*" || input[key] === "/") {
        return input[key];
    }

    throw new Error(`${label} must be one of "+", "-", "*", "/", null, or "randomized"`);
}

function isPlainObject(input: unknown): input is Record<string, unknown> {
    return typeof input === "object" && input !== null && !Array.isArray(input);
}
