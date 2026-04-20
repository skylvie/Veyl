import type { CliOptions, LoadedConfig } from "../types/cli.js";
import { DEFAULT_CONFIG_FILE, loadConfigFile, loadDefaultConfigFile } from "../config/index.js";
import path from "node:path";

export function loadCliConfig(options: CliOptions, cwd: string): LoadedConfig {
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
