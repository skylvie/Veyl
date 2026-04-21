import type { NumberObfuscationOperator, ObfuscationConfig, ObfuscationStats } from "@skylvi/veyl";
import type { CliOptions } from "../types/cli.js";
import type { CliLogger } from "../types/logger.js";
import { color } from "../utils/color.js";

export function printRunHeader(logger: CliLogger, options: CliOptions, configSource: string): void {
    logger.debug(`${color.gray("input: ")} ${options.input}\n`);
    logger.debug(`${color.gray("output:")} ${options.output}\n`);
    logger.debug(`${color.gray("config:")} ${configSource}\n\n`);
    logger.info(`${color.blue("[run]")} bundling, transforming, and emitting...\n`);
}

export function printStats(
    logger: CliLogger,
    stats: ObfuscationStats,
    config: ObfuscationConfig
): void {
    const totalLiterals =
        stats.obfuscatedStrings + stats.obfuscatedNumbers + stats.obfuscatedBooleans;

    logger.info(`${color.green("[ok]")} wrote ${color.bold(stats.output)}\n`);
    logger.debug("\n");
    printConfigSummary(logger, config, stats);
    logger.debug(`${color.bold("Summary")}\n`);
    logger.debug(`  bundled:    ${formatKilobytes(stats.bundledBytes)}\n`);
    logger.debug(`  output:     ${formatKilobytes(stats.outputBytes)}\n`);
    logger.debug(`  bindings:   ${stats.renamedBindings} renamed\n`);
    logger.debug(`  properties: ${stats.renamedProperties} renamed\n`);
    logger.debug(`  depth refs: ${stats.addedDepthReferences} added\n`);
    logger.debug(`  dead code:  ${stats.addedDeadCodeBlocks} blocks\n`);
    logger.debug(
        `  literals:   ${totalLiterals} obfuscated ` +
            color.gray(
                `(${stats.obfuscatedStrings} strings, ${stats.obfuscatedNumbers} numbers, ${stats.obfuscatedBooleans} booleans)`
            )
    );
    logger.debug(`\n  time:       ${stats.elapsedMs.toFixed(0)} ms\n`);
}

function printConfigSummary(
    logger: CliLogger,
    config: ObfuscationConfig,
    stats: ObfuscationStats
): void {
    logger.debug(`${color.bold("Config")}\n`);
    logger.debug(`  log level:                      ${config.log_level}\n`);
    logger.debug(
        `  obfuscated strings:             ${formatBoolean(config.features.obfuscate.strings)}\n`
    );
    logger.debug(
        `  obfuscated numbers:             ${formatBoolean(config.features.obfuscate.numbers)}\n`
    );
    logger.debug(
        `  obfuscated booleans:            ${formatBoolean(config.features.obfuscate.booleans)}\n`
    );
    logger.debug(
        `  randomized unique identifiers:  ${formatBoolean(config.features.randomized_unique_identifiers)}\n`
    );
    logger.debug(
        `  unnecessary depth:              ${formatBoolean(config.features.unnecessary_depth)}\n`
    );
    logger.debug(
        `  dead code injection:            ${formatBoolean(config.features.dead_code_injection)}\n`
    );
    logger.debug(
        `  boolean obfuscation number:     ${formatOptionalNumber(stats.booleanObfuscationNumber)}\n`
    );
    logger.debug(
        `  number obfuscation offset:      ${formatOptionalNumber(stats.numberObfuscationOffset)}\n`
    );
    logger.debug(
        `  number obfuscation operator:    ${formatNumberOperators(stats.numberObfuscationOperators)}\n\n`
    );
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
