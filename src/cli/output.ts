import type { NumberObfuscationOperator, ObfuscationConfig } from "../types/config.js";
import type { ObfuscationStats } from "../types/core.js";
import type { CliOptions } from "../types/cli.js";
import type { CliLogger } from "../types/logger.js";
import chalk from "chalk";

export function printRunHeader(logger: CliLogger, options: CliOptions, configSource: string): void {
    logger.debug(`${chalk.gray("input: ")} ${options.input}\n`);
    logger.debug(`${chalk.gray("output:")} ${options.output}\n`);
    logger.debug(`${chalk.gray("config:")} ${configSource}\n\n`);
    logger.info(`${chalk.blue("[run]")} bundling, transforming, and emitting...\n`);
}

export function printStats(logger: CliLogger, stats: ObfuscationStats, config: ObfuscationConfig): void {
    const totalLiterals = stats.obfuscatedStrings + stats.obfuscatedNumbers + stats.obfuscatedBooleans;

    logger.info(`${chalk.green("[ok]")} wrote ${chalk.bold(stats.output)}\n`);
    logger.debug("\n");
    printConfigSummary(logger, config, stats);
    logger.debug(`${chalk.bold("Summary")}\n`);
    logger.debug(`  bundled:    ${formatKilobytes(stats.bundledBytes)}\n`);
    logger.debug(`  output:     ${formatKilobytes(stats.outputBytes)}\n`);
    logger.debug(`  bindings:   ${stats.renamedBindings} renamed\n`);
    logger.debug(`  properties: ${stats.renamedProperties} renamed\n`);
    logger.debug(`  depth refs: ${stats.addedDepthReferences} added\n`);
    logger.debug(
        `  literals:   ${totalLiterals} obfuscated ` +
        chalk.gray(`(${stats.obfuscatedStrings} strings, ${stats.obfuscatedNumbers} numbers, ${stats.obfuscatedBooleans} booleans)`),
    );
    logger.debug(`\n  time:       ${stats.elapsedMs.toFixed(0)} ms\n`);
}

function printConfigSummary(logger: CliLogger, config: ObfuscationConfig, stats: ObfuscationStats): void {
    logger.debug(`${chalk.bold("Config")}\n`);
    logger.debug(`  log level:                      ${config.log_level}\n`);
    logger.debug(`  obfuscated strings:             ${formatBoolean(config.features.obfuscate.strings)}\n`);
    logger.debug(`  obfuscated numbers:             ${formatBoolean(config.features.obfuscate.numbers)}\n`);
    logger.debug(`  obfuscated booleans:            ${formatBoolean(config.features.obfuscate.booleans)}\n`);
    logger.debug(`  randomized unique identifiers:  ${formatBoolean(config.features.randomized_unique_identifiers)}\n`);
    logger.debug(`  unnecessary depth:              ${formatBoolean(config.features.unnecessary_depth)}\n`);
    logger.debug(`  boolean obfuscation number:     ${formatOptionalNumber(stats.booleanObfuscationNumber)}\n`);
    logger.debug(`  number obfuscation offset:      ${formatOptionalNumber(stats.numberObfuscationOffset)}\n`);
    logger.debug(`  number obfuscation operator:    ${formatNumberOperators(stats.numberObfuscationOperators)}\n\n`);
}

function formatKilobytes(bytes: number): string {
    return `${(bytes / 1024).toFixed(1)} KB`;
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
