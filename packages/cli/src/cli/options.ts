import path from "node:path";
import type { LogLevel, NumberObfuscationOperator } from "@skylvi/veyl";
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
        .description("Bundle and obfuscate a TypeScript or JavaScript entry file.")
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
        .version(versionText, "-v, --version", "Show project info, credits, and version.")
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
    const program = new Command()
        .allowUnknownOption(true)
        .exitOverride()
        .addOption(
            new Option("--log-level, --log_level <none|error|info|debug>").argParser(
                (value: string) => parseLogLevel(value, "--log-level")
            )
        );

    try {
        program.parse(argv, { from: "user" });
        return program.opts<{ logLevel?: LogLevel }>().logLevel ?? null;
    } catch {
        return null;
    }
}

function buildConfigOverrides(parsed: CommanderCliOptions) {
    let configOverrides = {};

    if (parsed.obfuscatedStrings !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            features: { obfuscate: { strings: parsed.obfuscatedStrings } },
        });
    }

    if (parsed.obfuscatedNumbers !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            features: { obfuscate: { numbers: parsed.obfuscatedNumbers } },
        });
    }

    if (parsed.obfuscatedBooleans !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            features: { obfuscate: { booleans: parsed.obfuscatedBooleans } },
        });
    }

    if (parsed.randomizedUniqueIdentifiers !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            features: {
                randomized_unique_identifiers: parsed.randomizedUniqueIdentifiers,
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

    if (parsed.numberObfuscationOffset !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            options: {
                number_offset: parsed.numberObfuscationOffset,
            },
        });
    }

    if (parsed.numberObfuscationOperator !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            options: {
                number_operator: parsed.numberObfuscationOperator,
            },
        });
    }

    if (parsed.booleanObfuscationNumber !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            options: {
                boolean_number: parsed.booleanObfuscationNumber,
            },
        });
    }

    if (parsed.unnecessaryDepth !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            features: {
                unnecessary_depth: parsed.unnecessaryDepth,
            },
        });
    }

    if (parsed.logLevel !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            log_level: parsed.logLevel,
        });
    }

    return configOverrides;
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

function parseNumberOperator(value: string, flag: string): NumberObfuscationOperator | null {
    if (value === "randomized") {
        return null;
    }

    if (value === "+" || value === "-" || value === "*" || value === "/") {
        return value;
    }

    throw new InvalidArgumentError(`${flag} must be one of +, -, *, /, or randomized`);
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
    numberObfuscationOffset?: number | null;
    numberObfuscationOperator?: NumberObfuscationOperator | null;
    booleanObfuscationNumber?: number | null;
    unnecessaryDepth?: boolean;
    logLevel?: LogLevel;
}
