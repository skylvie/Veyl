export type {
    LogLevel,
    NumberObfuscationMethod,
    NumberObfuscationOperator,
    NumberObfuscationOperatorFamily,
    ObfuscationConfig,
    ObfuscationConfigInput,
    StringObfuscationMethod,
} from "@skylvi/veyl-config/browser";
export {
    DEFAULT_CONFIG_FILE,
    DEFAULT_OBFUSCATION_CONFIG,
    mergeConfig,
    resolveConfig,
} from "@skylvi/veyl-config/browser";
export { obfuscateCodeInBrowser as obfuscateCode } from "./core/browserObfuscate.js";
export type { ObfuscateCodeResult } from "./types/core.js";
