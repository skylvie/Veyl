#!/usr/bin/env node
import chalk from "chalk";
import { loadCliConfig } from "./cli/config.js";
import { buildHelpText, parseCliArgs, readLogLevelFlag, resolveCliPaths } from "./cli/options.js";
import { printRunHeader, printStats } from "./cli/output.js";
import { buildVersionText } from "./cli/projectInfo.js";
import { mergeConfig, obfuscateFile, resolveConfig } from "./index.js";
import type { LogLevel } from "./types/config.js";
import { createLogger } from "./utils/logger.js";

let activeLogLevel: LogLevel = "info";

async function main(): Promise<void> {
    const commandName = "veyl";
    activeLogLevel = readLogLevelFlag(process.argv.slice(2)) ?? activeLogLevel;
    const options = parseCliArgs(process.argv.slice(2));

    if (options.help) {
        process.stdout.write(`${buildHelpText(commandName)}\n`);
        return;
    }

    if (options.version) {
        process.stdout.write(`${buildVersionText()}\n`);
        return;
    }

    const resolved = resolveCliPaths(options, process.cwd());
    const loadedConfig = loadCliConfig(resolved, process.cwd());
    const configInput = mergeConfig(loadedConfig.input, resolved.configOverrides);
    const config = resolveConfig(configInput);

    activeLogLevel = config.log_level;

    const logger = createLogger(activeLogLevel);

    printRunHeader(logger, resolved, loadedConfig.source);

    const stats = await obfuscateFile({
        input: resolved.input,
        output: resolved.output,
        config: configInput,
    });

    printStats(logger, stats, config);
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    const logger = createLogger(activeLogLevel);

    logger.error(`${chalk.red("[error]")} ${message}\n`);
    process.exitCode = 1;
});
