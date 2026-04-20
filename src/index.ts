export type {
    NumberObfuscationOperator,
    ObfuscationConfig,
    ObfuscationConfigInput,
} from "./utils/config.js";

export type {
    ObfuscateCodeResult,
    ObfuscateFileOptions,
    ObfuscationStats,
} from "./core/obfuscate.js";

export {
    DEFAULT_CONFIG_FILE,
    DEFAULT_OBFUSCATION_CONFIG,
    loadConfigFile,
    loadDefaultConfigFile,
    mergeConfig,
    resolveConfig,
} from "./utils/config.js";

export {
    obfuscateCode,
    obfuscateFile,
} from "./core/obfuscate.js";
