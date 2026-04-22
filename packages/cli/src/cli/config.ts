import path from "node:path";
import { DEFAULT_CONFIG_FILE, loadConfigFile, loadDefaultConfigFile } from "@skylvi/veyl-config";
import type { CliOptions, LoadedConfig } from "../types/cli.js";

export function loadCliConfig(options: CliOptions, cwd: string): LoadedConfig {
    if (options.configFile !== null) {
        return {
            input: resolveConfigPaths(
                loadConfigFile(options.configFile),
                path.dirname(options.configFile)
            ),
            source: options.configFile,
        };
    }

    const defaultConfig = resolveConfigPaths(loadDefaultConfigFile(cwd), cwd);

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

function resolveConfigPaths(input: LoadedConfig["input"], baseDir: string): LoadedConfig["input"] {
    const publicKey = input.features?.encryption?.public_key;
    const privateKey = input.features?.encryption?.private_key;

    if (publicKey === undefined && privateKey === undefined) {
        return input;
    }

    return {
        ...input,
        features: {
            ...input.features,
            encryption: {
                ...input.features?.encryption,
                public_key:
                    publicKey === undefined || publicKey === null
                        ? publicKey
                        : path.resolve(baseDir, publicKey),
                private_key:
                    privateKey === undefined || privateKey === null
                        ? privateKey
                        : path.resolve(baseDir, privateKey),
            },
        },
    };
}
