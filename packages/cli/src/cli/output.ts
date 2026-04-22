import type { NumberObfuscationOperator, ObfuscationStats } from "@skylvi/veyl";
import type { ObfuscationConfig } from "@skylvi/veyl-config";
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
    logger.debug(`  flattened:  ${stats.flattenedControlFlowBlocks} blocks\n`);
    logger.debug(`  simplified: ${stats.simplifiedStatements} rewrites\n`);
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
    logger.debug(`  minify:                         ${formatBoolean(config.minify)}\n`);
    logger.debug(
        `  string obfuscation:             ${formatBoolean(config.obfuscate.strings.enabled)}\n`
    );
    logger.debug(
        `  string encoding:                ${formatBoolean(config.obfuscate.strings.encode)}\n`
    );
    logger.debug(
        `  string unicode escapes:         ${formatBoolean(config.obfuscate.strings.unicode_escape_sequence)}\n`
    );
    logger.debug(`  string method:                  ${config.obfuscate.strings.method}\n`);
    logger.debug(`  string split length:            ${config.obfuscate.strings.split_length}\n`);
    logger.debug(
        `  number obfuscation:             ${formatBoolean(config.obfuscate.numbers.enabled)}\n`
    );
    logger.debug(`  number method:                  ${config.obfuscate.numbers.method}\n`);
    logger.debug(
        `  boolean obfuscation:            ${formatBoolean(config.obfuscate.booleans.enabled)}\n`
    );
    logger.debug(`  boolean method:                 ${config.obfuscate.booleans.method}\n`);
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
        `  control flow flattening:        ${formatBoolean(config.features.control_flow_flattening)}\n`
    );
    logger.debug(`  simplify:                       ${formatBoolean(config.features.simplify)}\n`);
    logger.debug(
        `  number offset:                  ${formatOptionalNumber(stats.numberObfuscationOffset)}\n`
    );
    logger.debug(
        `  number operator family:         ${formatNumberOperators(stats.numberObfuscationOperators)}\n`
    );
    logger.debug(
        `  boolean number:                 ${formatOptionalNumber(stats.booleanObfuscationNumber)}\n`
    );
    logger.debug(
        `  boolean depth:                  ${formatBooleanDepth(config.obfuscate.booleans.depth)}\n\n`
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

function formatBooleanDepth(value: number | "randomized" | null): string {
    return value === null ? "default" : String(value);
}
