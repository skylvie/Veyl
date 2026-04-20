import type { ObfuscationConfig } from "../types/config.js";

export const DEFAULT_CONFIG_FILE = "veyl_config.json";

export const DEFAULT_OBFUSCATION_CONFIG: ObfuscationConfig = {
    log_level: "info",
    features: {
        obfuscate: {
            strings: true,
            numbers: true,
            booleans: true,
        },
        randomized_unique_identifiers: true,
        unnecessary_depth: true,
    },
    options: {
        boolean_number: null,
        number_offset: null,
        number_operator: null,
    },
};
