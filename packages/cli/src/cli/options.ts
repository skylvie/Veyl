import path from "node:path";
import type { LogLevel, NumberObfuscationOperator, StringObfuscationMethod } from "@skylvi/veyl";
import { DEFAULT_CONFIG_FILE, mergeConfig } from "@skylvi/veyl";
import { Command, InvalidArgumentError, Option } from "commander";
import type { CliOptions } from "../types/cli.js";

export function resolveCliPaths(options: CliOptions, cwd: string): CliOptions {
    return {
        ...options,
        input: path.resolve(cwd, options.input),
        output: path.resolve(cwd, options.output),
        configFile: options.configFile === null ? null : path.resolve(cwd, options.configFile),
    };
}

export function buildCliProgram(versionText: string): Command {
    const program = new Command();

    program
        .name("veyl")
        .description("A complete and customizable JavaScript and TypeScript obfuscation utility.")
        .requiredOption("-i, --input <path>", "Input TS or JS file to bundle and obfuscate.")
        .requiredOption("-o, --output <path>", "Output JS file to write.")
        .option(
            "-c, --config <path>",
            `Config JSON file. Defaults to ./${DEFAULT_CONFIG_FILE} when present.`
        )
        .addOption(
            new Option(
                "--obfuscated-strings, --obfuscated_strings <true|false>",
                "Enable or disable string literal obfuscation."
            ).argParser((value: string) => parseBoolean(value, "--obfuscated-strings"))
        )
        .addOption(
            new Option(
                "--obfuscated-numbers, --obfuscated_numbers <true|false>",
                "Enable or disable number literal obfuscation."
            ).argParser((value: string) => parseBoolean(value, "--obfuscated-numbers"))
        )
        .addOption(
            new Option(
                "--obfuscated-booleans, --obfuscated_booleans <true|false>",
                "Enable or disable boolean literal obfuscation."
            ).argParser((value: string) => parseBoolean(value, "--obfuscated-booleans"))
        )
        .addOption(
            new Option(
                "--randomized-unique-identifiers, --randomized_unique_identifiers <true|false>",
                "Use Veyl randomized names instead of esbuild minified identifiers."
            ).argParser((value: string) => parseBoolean(value, "--randomized-unique-identifiers"))
        )
        .addOption(
            new Option(
                "--minify <true|false>",
                "Enable or disable the final esbuild minify step."
            ).argParser((value: string) => parseBoolean(value, "--minify"))
        )
        .addOption(
            new Option(
                "--functionify <true|false>",
                "Wrap the transformed program body in a runtime `new Function(...)` call."
            ).argParser((value: string) => parseBoolean(value, "--functionify"))
        )
        .addOption(
            new Option(
                "--dead-code-injection, --dead_code_injection <true|false>",
                "Insert unreachable decoy code blocks throughout the transformed program."
            ).argParser((value: string) => parseBoolean(value, "--dead-code-injection"))
        )
        .addOption(
            new Option(
                "--control-flow-flattening, --control_flow_flattening <true|false>",
                "Rewrite eligible statement sequences into flattened dispatcher loops."
            ).argParser((value: string) => parseBoolean(value, "--control-flow-flattening"))
        )
        .addOption(
            new Option(
                "--simplify <true|false>",
                "Apply compacting rewrites such as merged declarations and conditional returns."
            ).argParser((value: string) => parseBoolean(value, "--simplify"))
        )
        .addOption(
            new Option(
                "--string-method, --string_method <array|split>",
                "String obfuscation method."
            ).argParser((value: string) => parseStringMethod(value, "--string-method"))
        )
        .addOption(
            new Option(
                "--string-split-length, --string_split_length <num>",
                "Chunk length used by split string obfuscation."
            ).argParser((value: string) =>
                parsePositiveInteger(value, "--string-split-length")
            )
        )
        .addOption(
            new Option(
                "--number-obfuscation-offset, --number_obfuscation_offset <num|randomized>",
                "Number offset for numeric literal obfuscation."
            ).argParser((value: string) =>
                parseNumberOrRandomized(value, "--number-obfuscation-offset")
            )
        )
        .addOption(
            new Option(
                "--number-obfuscation-operator, --number_obfuscation_operator <+|-|*|/|randomized>",
                "Number operator for numeric literal obfuscation."
            ).argParser((value: string) =>
                parseNumberOperator(value, "--number-obfuscation-operator")
            )
        )
        .addOption(
            new Option(
                "--boolean-obfuscation-number, --boolean_obfuscation_number <num|randomized>",
                "Numeric token used for obfuscated true values."
            ).argParser((value: string) =>
                parseNumberOrRandomized(value, "--boolean-obfuscation-number")
            )
        )
        .addOption(
            new Option(
                "--unnecessary-depth, --unnecessary_depth <true|false>",
                "Enable or disable unnecessary depth references."
            ).argParser((value: string) => parseBoolean(value, "--unnecessary-depth"))
        )
        .addOption(
            new Option(
                "--log-level, --log_level <none|error|info|debug>",
                "Control CLI output verbosity."
            ).argParser((value: string) => parseLogLevel(value, "--log-level"))
        )
        .version(versionText, "-v, --version", "Display version number.")
        .exitOverride();

    return program;
}

export function parseCliArgs(program: Command, argv: string[]): CliOptions {
    program.parse(argv, { from: "user" });
    const parsed = program.opts<CommanderCliOptions>();

    return {
        input: parsed.input,
        output: parsed.output,
        configFile: parsed.config ?? null,
        configOverrides: buildConfigOverrides(parsed),
    };
}

export function readLogLevelFlag(argv: string[]): LogLevel | null {
    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];

        if (token !== "--log-level" && token !== "--log_level") {
            if (!token.startsWith("--log-level=") && !token.startsWith("--log_level=")) {
                continue;
            }
        }

        const value = token.includes("=")
            ? token.slice(token.indexOf("=") + 1)
            : (argv[i + 1] ?? null);

        if (value === null) {
            return null;
        }

        try {
            return parseLogLevel(value, "--log-level");
        } catch {
            return null;
        }
    }

    return null;
}

function buildConfigOverrides(parsed: CommanderCliOptions) {
    const obfuscatedStrings = readAliasedOption(
        parsed,
        "obfuscatedStrings",
        "obfuscated_strings"
    ) as boolean | undefined;
    const obfuscatedNumbers = readAliasedOption(
        parsed,
        "obfuscatedNumbers",
        "obfuscated_numbers"
    ) as boolean | undefined;
    const obfuscatedBooleans = readAliasedOption(
        parsed,
        "obfuscatedBooleans",
        "obfuscated_booleans"
    ) as boolean | undefined;
    const randomizedUniqueIdentifiers = readAliasedOption(
        parsed,
        "randomizedUniqueIdentifiers",
        "randomized_unique_identifiers"
    ) as boolean | undefined;
    const deadCodeInjection = readAliasedOption(
        parsed,
        "deadCodeInjection",
        "dead_code_injection"
    ) as boolean | undefined;
    const controlFlowFlattening = readAliasedOption(
        parsed,
        "controlFlowFlattening",
        "control_flow_flattening"
    ) as boolean | undefined;
    const simplify = readAliasedOption(parsed, "simplify", "simplify") as boolean | undefined;
    const stringMethod = readAliasedOption(parsed, "stringMethod", "string_method") as
        | StringObfuscationMethod
        | undefined;
    const stringSplitLength = readAliasedOption(parsed, "stringSplitLength", "string_split_length") as
        | number
        | undefined;
    const numberObfuscationOffset = readAliasedOption(
        parsed,
        "numberObfuscationOffset",
        "number_obfuscation_offset"
    ) as number | null | undefined;
    const numberObfuscationOperator = readAliasedOption(
        parsed,
        "numberObfuscationOperator",
        "number_obfuscation_operator"
    ) as NumberObfuscationOperator | null | undefined;
    const booleanObfuscationNumber = readAliasedOption(
        parsed,
        "booleanObfuscationNumber",
        "boolean_obfuscation_number"
    ) as number | null | undefined;
    const unnecessaryDepth = readAliasedOption(parsed, "unnecessaryDepth", "unnecessary_depth") as
        | boolean
        | undefined;
    const logLevel = readAliasedOption(parsed, "logLevel", "log_level") as LogLevel | undefined;
    let configOverrides = {};

    if (obfuscatedStrings !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            features: { obfuscate: { strings: obfuscatedStrings } },
        });
    }

    if (obfuscatedNumbers !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            features: { obfuscate: { numbers: obfuscatedNumbers } },
        });
    }

    if (obfuscatedBooleans !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            features: { obfuscate: { booleans: obfuscatedBooleans } },
        });
    }

    if (randomizedUniqueIdentifiers !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            features: {
                randomized_unique_identifiers: randomizedUniqueIdentifiers,
            },
        });
    }

    if (parsed.minify !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            options: {
                minify: parsed.minify,
            },
        });
    }

    if (parsed.functionify !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            features: {
                functionify: parsed.functionify,
            },
        });
    }

    if (deadCodeInjection !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            features: {
                dead_code_injection: deadCodeInjection,
            },
        });
    }

    if (controlFlowFlattening !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            features: {
                control_flow_flattening: controlFlowFlattening,
            },
        });
    }

    if (simplify !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            features: {
                simplify,
            },
        });
    }

    if (stringMethod !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            options: {
                string_method: stringMethod,
            },
        });
    }

    if (stringSplitLength !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            options: {
                string_split_length: stringSplitLength,
            },
        });
    }

    if (numberObfuscationOffset !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            options: {
                number_offset: numberObfuscationOffset,
            },
        });
    }

    if (numberObfuscationOperator !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            options: {
                number_operator: numberObfuscationOperator,
            },
        });
    }

    if (booleanObfuscationNumber !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            options: {
                boolean_number: booleanObfuscationNumber,
            },
        });
    }

    if (unnecessaryDepth !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            features: {
                unnecessary_depth: unnecessaryDepth,
            },
        });
    }

    if (logLevel !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            log_level: logLevel,
        });
    }

    return configOverrides;
}

function readAliasedOption(
    parsed: CommanderCliOptions,
    camelCaseKey: keyof CommanderCliOptions,
    snakeCaseKey: string
): unknown {
    const parsedRecord = parsed as unknown as Record<string, unknown>;
    const camelCaseValue = parsedRecord[camelCaseKey as string];

    if (camelCaseValue !== undefined) {
        return camelCaseValue;
    }

    return parsedRecord[snakeCaseKey];
}

function parseBoolean(value: string, flag: string): boolean {
    if (value === "true") {
        return true;
    }

    if (value === "false") {
        return false;
    }

    throw new InvalidArgumentError(`${flag} must be true or false`);
}

function parseNumberOrRandomized(value: string, flag: string): number | null {
    if (value === "randomized") {
        return null;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        throw new InvalidArgumentError(`${flag} must be a finite number or randomized`);
    }

    return parsed;
}

function parsePositiveInteger(value: string, flag: string): number {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new InvalidArgumentError(`${flag} must be a positive integer`);
    }

    return parsed;
}

function parseNumberOperator(value: string, flag: string): NumberObfuscationOperator | null {
    if (value === "randomized") {
        return null;
    }

    if (value === "+" || value === "-" || value === "*" || value === "/") {
        return value;
    }

    throw new InvalidArgumentError(`${flag} must be one of +, -, *, /, or randomized`);
}

function parseStringMethod(value: string, flag: string): StringObfuscationMethod {
    if (value === "array" || value === "split") {
        return value;
    }

    throw new InvalidArgumentError(`${flag} must be array or split`);
}

function parseLogLevel(value: string, flag: string): LogLevel {
    if (value === "none" || value === "error" || value === "info" || value === "debug") {
        return value;
    }

    throw new InvalidArgumentError(`${flag} must be one of none, error, info, or debug`);
}

interface CommanderCliOptions {
    input: string;
    output: string;
    config?: string;
    obfuscatedStrings?: boolean;
    obfuscatedNumbers?: boolean;
    obfuscatedBooleans?: boolean;
    randomizedUniqueIdentifiers?: boolean;
    minify?: boolean;
    functionify?: boolean;
    deadCodeInjection?: boolean;
    controlFlowFlattening?: boolean;
    simplify?: boolean;
    stringMethod?: StringObfuscationMethod;
    stringSplitLength?: number;
    numberObfuscationOffset?: number | null;
    numberObfuscationOperator?: NumberObfuscationOperator | null;
    booleanObfuscationNumber?: number | null;
    unnecessaryDepth?: boolean;
    logLevel?: LogLevel;
}
