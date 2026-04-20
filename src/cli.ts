#!/usr/bin/env node
import chalk from "chalk";
import path from "node:path";
import { obfuscateFile } from "./index.js";
import type { ObfuscationStats } from "./index.js";

interface CliOptions {
    input: string;
    output: string;
    help: boolean;
}

interface CliOptionDefinition {
    flags: string[];
    target: keyof CliOptions;
    takesValue: boolean;
    valueName?: string;
    required: boolean;
    description: string;
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
        help: false,
    };

    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        const definition = OPTION_DEFINITIONS.find((item) => item.flags.includes(token));

        if (definition === undefined) {
            throw new Error(`Unknown option: ${token}`);
        }

        if (!definition.takesValue) {
            if (definition.target === "help") {
                options.help = true;
            }

            continue;
        }

        const value = argv[i + 1];

        if (value === undefined || value.startsWith("-")) {
            throw new Error(`Missing value for ${definition.flags[0]}`);
        }

        if (definition.target === "input") {
            options.input = value;
        } else if (definition.target === "output") {
            options.output = value;
        } else {
            throw new Error(`${definition.flags[0]} does not take a value`);
        }

        i++;
    }

    if (options.help) {
        return options;
    }

    for (const definition of OPTION_DEFINITIONS) {
        const value = options[definition.target];

        if (definition.required && (value === "" || value === false)) {
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

function printRunHeader(options: CliOptions): void {
    process.stdout.write(`${chalk.cyan.bold("veyl")} ${chalk.gray("obfuscating TypeScript/JavaScript")}\n`);
    process.stdout.write(`${chalk.gray("input: ")} ${options.input}\n`);
    process.stdout.write(`${chalk.gray("output:")} ${options.output}\n\n`);
    process.stdout.write(`${chalk.blue("[run]")} bundling, transforming, and emitting...\n`);
}

function printStats(stats: ObfuscationStats): void {
    const totalLiterals = stats.obfuscatedStrings + stats.obfuscatedNumbers + stats.obfuscatedBooleans;

    process.stdout.write(`${chalk.green("[ok]")} wrote ${chalk.bold(stats.output)}\n\n`);
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
    printRunHeader(resolved);

    const stats = await obfuscateFile({
        input: resolved.input,
        output: resolved.output,
    });

    printStats(stats);
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);

    process.stderr.write(`${chalk.red("[error]")} ${message}\n`);
    process.exitCode = 1;
});
