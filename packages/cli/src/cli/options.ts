import path from "node:path";
import type { LogLevel, NumberObfuscationOperator } from "@skylvi/veyl";
import { mergeConfig } from "@skylvi/veyl";
import type { CliOptions } from "../types/cli.js";
import { color } from "../utils/color.js";
import { OPTION_DEFINITIONS } from "./definitions.js";

export function parseCliArgs(argv: string[]): CliOptions {
    const options: CliOptions = {
        input: "",
        output: "",
        configFile: null,
        configOverrides: {},
        help: false,
        version: false,
    };

    for (let i = 0; i < argv.length; i++) {
        const parsedToken = splitOptionToken(argv[i]);
        const definition = OPTION_DEFINITIONS.find((item) => item.flags.includes(parsedToken.flag));

        if (definition === undefined) {
            throw new Error(`Unknown option: ${parsedToken.flag}`);
        }

        if (!definition.takesValue) {
            if (parsedToken.value !== undefined) {
                throw new Error(`${parsedToken.flag} does not take a value`);
            }

            if (definition.target === "help") {
                options.help = true;
            }

            if (definition.target === "version") {
                options.version = true;
            }

            continue;
        }

        const value = parsedToken.value ?? argv[i + 1];

        if (value === undefined || (parsedToken.value === undefined && value.startsWith("-"))) {
            throw new Error(`Missing value for ${definition.flags[0]}`);
        }

        assignCliValue(options, definition.target, value);

        if (parsedToken.value === undefined) {
            i++;
        }
    }

    if (options.help || options.version) {
        return options;
    }

    if (options.input === "" && options.output === "") {
        throw new Error("Missing input and output. Run `veyl -h` for help.");
    }

    for (const definition of OPTION_DEFINITIONS) {
        if (definition.required && isMissingRequiredOption(options, definition.target)) {
            throw new Error(`Missing required option: ${definition.flags[0]}`);
        }
    }

    return options;
}

export function resolveCliPaths(options: CliOptions, cwd: string): CliOptions {
    return {
        ...options,
        input: path.resolve(cwd, options.input),
        output: path.resolve(cwd, options.output),
        configFile: options.configFile === null ? null : path.resolve(cwd, options.configFile),
    };
}

export function buildHelpText(commandName: string): string {
    const lines = [
        `${color.bold("Usage:")} ${color.cyan(commandName)} -i ./input.ts -o ./output.js`,
        "",
        color.bold("Options:"),
    ];

    for (const option of OPTION_DEFINITIONS) {
        const flagText = color.green((option.helpFlags ?? option.flags).join(", "));
        const valueText =
            option.valueName === undefined ? "" : color.gray(` <${option.valueName}>`);

        lines.push(`  ${flagText}${valueText}  ${option.description}`);
    }

    return lines.join("\n");
}

export function readLogLevelFlag(argv: string[]): LogLevel | null {
    for (let i = 0; i < argv.length; i++) {
        const parsedToken = splitOptionToken(argv[i]);

        if (parsedToken.flag !== "--log-level" && parsedToken.flag !== "--log_level") {
            continue;
        }

        const value = parsedToken.value ?? argv[i + 1];

        if (value === undefined) {
            return null;
        }

        return parseLogLevel(value, "--log-level");
    }

    return null;
}

function splitOptionToken(token: string): { flag: string; value?: string } {
    const separatorIndex = token.indexOf("=");

    if (separatorIndex === -1) {
        return {
            flag: token,
        };
    }

    return {
        flag: token.slice(0, separatorIndex),
        value: token.slice(separatorIndex + 1),
    };
}

function assignCliValue(options: CliOptions, target: string, value: string): void {
    switch (target) {
        case "input":
            options.input = value;
            return;
        case "output":
            options.output = value;
            return;
        case "configFile":
            options.configFile = value;
            return;
        case "obfuscatedStrings":
            options.configOverrides = mergeConfig(options.configOverrides, {
                features: { obfuscate: { strings: parseBoolean(value, "--obfuscated-strings") } },
            });
            return;
        case "obfuscatedNumbers":
            options.configOverrides = mergeConfig(options.configOverrides, {
                features: { obfuscate: { numbers: parseBoolean(value, "--obfuscated-numbers") } },
            });
            return;
        case "obfuscatedBooleans":
            options.configOverrides = mergeConfig(options.configOverrides, {
                features: { obfuscate: { booleans: parseBoolean(value, "--obfuscated-booleans") } },
            });
            return;
        case "randomizedUniqueIdentifiers":
            options.configOverrides = mergeConfig(options.configOverrides, {
                features: {
                    randomized_unique_identifiers: parseBoolean(
                        value,
                        "--randomized-unique-identifiers"
                    ),
                },
            });
            return;
        case "minify":
            options.configOverrides = mergeConfig(options.configOverrides, {
                options: {
                    minify: parseBoolean(value, "--minify"),
                },
            });
            return;
        case "functionify":
            options.configOverrides = mergeConfig(options.configOverrides, {
                features: {
                    functionify: parseBoolean(value, "--functionify"),
                },
            });
            return;
        case "numberObfuscationOffset":
            options.configOverrides = mergeConfig(options.configOverrides, {
                options: {
                    number_offset: parseNumberOrRandomized(value, "--number-obfuscation-offset"),
                },
            });
            return;
        case "numberObfuscationOperator":
            options.configOverrides = mergeConfig(options.configOverrides, {
                options: {
                    number_operator: parseNumberOperator(value, "--number-obfuscation-operator"),
                },
            });
            return;
        case "booleanObfuscationNumber":
            options.configOverrides = mergeConfig(options.configOverrides, {
                options: {
                    boolean_number: parseNumberOrRandomized(value, "--boolean-obfuscation-number"),
                },
            });
            return;
        case "unnecessaryDepth":
            options.configOverrides = mergeConfig(options.configOverrides, {
                features: { unnecessary_depth: parseBoolean(value, "--unnecessary-depth") },
            });
            return;
        case "logLevel":
            options.configOverrides = mergeConfig(options.configOverrides, {
                log_level: parseLogLevel(value, "--log-level"),
            });
            return;
        default:
            throw new Error(`Unsupported option target: ${target}`);
    }
}

function isMissingRequiredOption(options: CliOptions, target: string): boolean {
    switch (target) {
        case "input":
            return options.input === "";
        case "output":
            return options.output === "";
        default:
            return false;
    }
}

function parseBoolean(value: string, flag: string): boolean {
    if (value === "true") {
        return true;
    }

    if (value === "false") {
        return false;
    }

    throw new Error(`${flag} must be true or false`);
}

function parseNumberOrRandomized(value: string, flag: string): number | null {
    if (value === "randomized") {
        return null;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        throw new Error(`${flag} must be a finite number or randomized`);
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

    throw new Error(`${flag} must be one of +, -, *, /, or randomized`);
}

function parseLogLevel(value: string, flag: string): LogLevel {
    if (value === "none" || value === "error" || value === "info" || value === "debug") {
        return value;
    }

    throw new Error(`${flag} must be one of none, error, info, or debug`);
}
