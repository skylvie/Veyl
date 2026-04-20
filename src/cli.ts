#!/usr/bin/env node
import chalk from "chalk";
import path from "node:path";
import { DEFAULT_CONFIG_FILE, loadConfigFile, loadDefaultConfigFile, mergeConfig, obfuscateFile, resolveConfig } from "./index.js";
import type { NumberObfuscationOperator, ObfuscationConfig, ObfuscationConfigInput, ObfuscationStats } from "./index.js";

interface CliOptions {
    input: string;
    output: string;
    configFile: string | null;
    configOverrides: ObfuscationConfigInput;
    help: boolean;
}

interface CliOptionDefinition {
    flags: string[];
    target: string;
    takesValue: boolean;
    valueName?: string;
    required: boolean;
    description: string;
}

interface LoadedConfig {
    input: ObfuscationConfigInput;
    source: string;
}

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
        flags: ["-h", "--help"],
        target: "help",
        takesValue: false,
        required: false,
        description: "Show this help text.",
    },
];

function parseCliArgs(argv: string[]): CliOptions {
    const options: CliOptions = {
        input: "",
        output: "",
        configFile: null,
        configOverrides: {},
        help: false,
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

    if (options.help) {
        return options;
    }

    for (const definition of OPTION_DEFINITIONS) {
        if (definition.required && isMissingRequiredOption(options, definition.target)) {
            throw new Error(`Missing required option: ${definition.flags[0]}`);
        }
    }

    return options;
}

function resolveCliPaths(options: CliOptions, cwd: string): CliOptions {
    return {
        ...options,
        input: path.resolve(cwd, options.input),
        output: path.resolve(cwd, options.output),
        configFile: options.configFile === null ? null : path.resolve(cwd, options.configFile),
    };
}

function buildHelpText(commandName: string): string {
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

function formatKilobytes(bytes: number): string {
    return `${(bytes / 1024).toFixed(1)} KB`;
}

function printRunHeader(options: CliOptions, configSource: string): void {
    process.stdout.write(`${chalk.gray("input: ")} ${options.input}\n`);
    process.stdout.write(`${chalk.gray("output:")} ${options.output}\n`);
    process.stdout.write(`${chalk.gray("config:")} ${configSource}\n\n`);
    process.stdout.write(`${chalk.blue("[run]")} bundling, transforming, and emitting...\n`);
}

function printStats(stats: ObfuscationStats, config: ObfuscationConfig): void {
    const totalLiterals = stats.obfuscatedStrings + stats.obfuscatedNumbers + stats.obfuscatedBooleans;

    process.stdout.write(`${chalk.green("[ok]")} wrote ${chalk.bold(stats.output)}\n\n`);
    printConfigSummary(config, stats);
    process.stdout.write(`${chalk.bold("Summary")}\n`);
    process.stdout.write(`  bundled:    ${formatKilobytes(stats.bundledBytes)}\n`);
    process.stdout.write(`  output:     ${formatKilobytes(stats.outputBytes)}\n`);
    process.stdout.write(`  bindings:   ${stats.renamedBindings} renamed\n`);
    process.stdout.write(`  properties: ${stats.renamedProperties} renamed\n`);
    process.stdout.write(`  depth refs: ${stats.addedDepthReferences} added\n`);
    process.stdout.write(
        `  literals:   ${totalLiterals} obfuscated ` +
        chalk.gray(`(${stats.obfuscatedStrings} strings, ${stats.obfuscatedNumbers} numbers, ${stats.obfuscatedBooleans} booleans)`),
    );
    process.stdout.write(`\n  time:       ${stats.elapsedMs.toFixed(0)} ms\n`);
}

async function main(): Promise<void> {
    const commandName = "veyl";
    const options = parseCliArgs(process.argv.slice(2));

    if (options.help) {
        process.stdout.write(`${buildHelpText(commandName)}\n`);
        return;
    }

    const resolved = resolveCliPaths(options, process.cwd());
    const loadedConfig = loadCliConfig(resolved, process.cwd());
    const configInput = mergeConfig(loadedConfig.input, resolved.configOverrides);
    const config = resolveConfig(configInput);

    printRunHeader(resolved, loadedConfig.source);

    const stats = await obfuscateFile({
        input: resolved.input,
        output: resolved.output,
        config: configInput,
    });

    printStats(stats, config);
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);

    process.stderr.write(`${chalk.red("[error]")} ${message}\n`);
    process.exitCode = 1;
});

function loadCliConfig(options: CliOptions, cwd: string): LoadedConfig {
    if (options.configFile !== null) {
        return {
            input: loadConfigFile(options.configFile),
            source: options.configFile,
        };
    }

    const defaultConfig = loadDefaultConfigFile(cwd);

    if (Object.keys(defaultConfig).length > 0) {
        return {
            input: defaultConfig,
            source: path.resolve(cwd, DEFAULT_CONFIG_FILE),
        };
    }

    return {
        input: {},
        source: "built-in defaults",
    };
}

function printConfigSummary(config: ObfuscationConfig, stats: ObfuscationStats): void {
    process.stdout.write(`${chalk.bold("Config")}\n`);
    process.stdout.write(`  obfuscated strings:             ${formatBoolean(config.features.obfuscate.strings)}\n`);
    process.stdout.write(`  obfuscated numbers:             ${formatBoolean(config.features.obfuscate.numbers)}\n`);
    process.stdout.write(`  obfuscated booleans:            ${formatBoolean(config.features.obfuscate.booleans)}\n`);
    process.stdout.write(`  randomized unique identifiers:  ${formatBoolean(config.features.randomized_unique_identifiers)}\n`);
    process.stdout.write(`  unnecessary depth:              ${formatBoolean(config.features.unnecessary_depth)}\n`);
    process.stdout.write(`  boolean obfuscation number:     ${formatOptionalNumber(stats.booleanObfuscationNumber)}\n`);
    process.stdout.write(`  number obfuscation offset:      ${formatOptionalNumber(stats.numberObfuscationOffset)}\n`);
    process.stdout.write(`  number obfuscation operator:    ${formatNumberOperators(stats.numberObfuscationOperators)}\n\n`);
}

function formatBoolean(value: boolean): string {
    return value ? "true" : "false";
}

function formatOptionalNumber(value: number | null): string {
    return value === null ? "disabled" : String(value);
}

function formatNumberOperators(value: NumberObfuscationOperator[]): string {
    if (value.length === 0) {
        return "disabled";
    }

    return value.join(", ");
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
