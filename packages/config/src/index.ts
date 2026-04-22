export { DEFAULT_CONFIG_FILE, DEFAULT_OBFUSCATION_CONFIG } from "./defaults.js";
export { loadConfigFile, loadDefaultConfigFile } from "./load.js";
export { mergeConfig, resolveConfig } from "./resolve.js";
export type {
    BooleanObfuscationMethod,
    LogLevel,
    NumberObfuscationMethod,
    NumberObfuscationOperator,
    NumberObfuscationOperatorFamily,
    ObfuscationConfig,
    ObfuscationConfigInput,
    StringObfuscationMethod,
} from "./types.js";
