export {
    DEFAULT_CONFIG_FILE,
    DEFAULT_OBFUSCATION_CONFIG,
    loadConfigFile,
    loadDefaultConfigFile,
    mergeConfig,
    resolveConfig,
} from "./config/index.js";
export {
    obfuscateCode,
    obfuscateFile,
} from "./core/obfuscate.js";
export type {
    LogLevel,
    NumberObfuscationOperator,
    ObfuscationConfig,
    ObfuscationConfigInput,
    StringObfuscationMethod,
} from "./types/config.js";
export type {
    ObfuscateCodeResult,
    ObfuscateFileOptions,
    ObfuscationStats,
} from "./types/core.js";
