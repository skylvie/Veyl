#!/usr/bin/env node
import type { LogLevel } from "@skylvi/veyl";
import { mergeConfig, obfuscateEntry, obfuscateFile, resolveConfig } from "@skylvi/veyl";
import { CommanderError } from "commander";
import { loadCliConfig } from "./cli/config.js";
import { buildCliProgram, parseCliArgs, readLogLevelFlag, resolveCliPaths } from "./cli/options.js";
import { printRunHeader, printStats } from "./cli/output.js";
import { readPackageVersion } from "./cli/projectInfo.js";
import { color } from "./utils/color.js";
import { createLogger } from "./utils/logger.js";

let activeLogLevel: LogLevel = "info";

async function main(): Promise<void> {
    activeLogLevel = readLogLevelFlag(process.argv.slice(2)) ?? activeLogLevel;

    const options = parseCliArgs(buildCliProgram(readPackageVersion()), process.argv.slice(2));
    const resolved = resolveCliPaths(options, process.cwd());
    const loadedConfig = loadCliConfig(resolved, process.cwd());
    const configInput = mergeConfig(loadedConfig.input, resolved.configOverrides);
    const config = resolveConfig(configInput);

    activeLogLevel = config.log_level;
    const logger = createLogger(activeLogLevel);

    printRunHeader(logger, resolved, loadedConfig.source);

    const result =
        resolved.output === null
            ? await obfuscateEntry({
                  input: resolved.input,
                  output: null,
                  config: configInput,
              })
            : {
                  code: null,
                  stats: await obfuscateFile({
                      input: resolved.input,
                      output: resolved.output,
                      config: configInput,
                  }),
              };

    printStats(logger, result.stats, config);

    if (resolved.output === null && result.code !== null) {
        process.stdout.write(result.code);
    }
}

main().catch((error: unknown) => {
    if (error instanceof CommanderError) {
        process.exitCode = error.exitCode;
        return;
    }

    const message =
        error instanceof Error ? error.message : typeof error === "string" ? error : String(error);
    const logger = createLogger(activeLogLevel);

    logger.error(`${color.red("[error]")} ${message}\n`);
    process.exitCode = 1;
});
