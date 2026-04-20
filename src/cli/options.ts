import type { LogLevel, NumberObfuscationOperator } from "../types/config.js";
import type { CliOptionDefinition, CliOptions } from "../types/cli.js";
import { DEFAULT_CONFIG_FILE, mergeConfig } from "../config/index.js";
import chalk from "chalk";
import path from "node:path";

const OPTION_DEFINITIONS: CliOptionDefinition[] = [
    {
        flags: ["-i", "--input"],
        target: "input",
        takesValue: true,
        valueName: "path",
        required: true,
        description: "Input TS or JS file to bundle and obfuscate.",
    },
    {
        flags: ["-o", "--output"],
        target: "output",
        takesValue: true,
        valueName: "path",
        required: true,
        description: "Output JS file to write.",
    },
    {
        flags: ["-c", "--config"],
        target: "configFile",
        takesValue: true,
        valueName: "path",
        required: false,
        description: `Config JSON file. Defaults to ./${DEFAULT_CONFIG_FILE} when present.`,
    },
    {
        flags: ["--obfuscated-strings"],
        target: "obfuscatedStrings",
        takesValue: true,
        valueName: "true|false",
        required: false,
        description: "Enable or disable string literal obfuscation.",
    },
    {
        flags: ["--obfuscated-numbers"],
        target: "obfuscatedNumbers",
        takesValue: true,
        valueName: "true|false",
        required: false,
        description: "Enable or disable number literal obfuscation.",
    },
    {
        flags: ["--obfuscated-booleans"],
        target: "obfuscatedBooleans",
        takesValue: true,
        valueName: "true|false",
        required: false,
        description: "Enable or disable boolean literal obfuscation.",
    },
    {
        flags: ["--randomized-unique-identifiers"],
        target: "randomizedUniqueIdentifiers",
        takesValue: true,
        valueName: "true|false",
        required: false,
        description: "Use Veyl randomized names instead of esbuild minified identifiers.",
    },
    {
        flags: ["--number-obfuscation-offset"],
        target: "numberObfuscationOffset",
        takesValue: true,
        valueName: "num|randomized",
        required: false,
        description: "Number offset for numeric literal obfuscation.",
    },
    {
        flags: ["--number-obfuscation-operator"],
        target: "numberObfuscationOperator",
        takesValue: true,
        valueName: "+|-|*|/|randomized",
        required: false,
        description: "Number operator for numeric literal obfuscation.",
    },
    {
        flags: ["--boolean-obfuscation-number"],
        target: "booleanObfuscationNumber",
        takesValue: true,
        valueName: "num|randomized",
        required: false,
        description: "Numeric token used for obfuscated true values.",
    },
    {
        flags: ["--unnecessary-depth"],
        target: "unnecessaryDepth",
        takesValue: true,
        valueName: "true|false",
        required: false,
        description: "Enable or disable unnecessary depth references.",
    },
    {
        flags: ["--log-level"],
        target: "logLevel",
        takesValue: true,
        valueName: "none|error|info|debug",
        required: false,
        description: "Control CLI output verbosity.",
    },
    {
        flags: ["-h", "--help"],
        target: "help",
        takesValue: false,
        required: false,
        description: "Show this help text.",
    },
    {
        flags: ["-v", "--version"],
        target: "version",
        takesValue: false,
        required: false,
        description: "Show project info, credits, and version.",
    },
];

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
        `${chalk.bold("Usage:")} ${chalk.cyan(commandName)} -i ./input.ts -o ./output.js`,
        "",
        chalk.bold("Options:"),
    ];

    for (const option of OPTION_DEFINITIONS) {
        const flagText = chalk.green(option.flags.join(", "));
        const valueText = option.valueName === undefined ? "" : chalk.gray(` <${option.valueName}>`);

        lines.push(`  ${flagText}${valueText}  ${option.description}`);
    }

    return lines.join("\n");
}

export function readLogLevelFlag(argv: string[]): LogLevel | null {
    for (let i = 0; i < argv.length; i++) {
        const parsedToken = splitOptionToken(argv[i]);

        if (parsedToken.flag !== "--log-level") {
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
                features: { randomized_unique_identifiers: parseBoolean(value, "--randomized-unique-identifiers") },
            });
            return;
        case "numberObfuscationOffset":
            options.configOverrides = mergeConfig(options.configOverrides, {
                options: { number_offset: parseNumberOrRandomized(value, "--number-obfuscation-offset") },
            });
            return;
        case "numberObfuscationOperator":
            options.configOverrides = mergeConfig(options.configOverrides, {
                options: { number_operator: parseNumberOperator(value, "--number-obfuscation-operator") },
            });
            return;
        case "booleanObfuscationNumber":
            options.configOverrides = mergeConfig(options.configOverrides, {
                options: { boolean_number: parseNumberOrRandomized(value, "--boolean-obfuscation-number") },
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
