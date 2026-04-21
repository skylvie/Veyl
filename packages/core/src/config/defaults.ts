import type { ObfuscationConfig } from "../types/config.js";

/** Default config filename Veyl looks for when no `-c` path is passed. */
export const DEFAULT_CONFIG_FILE = "veyl_config.json";

/** Built-in Veyl defaults used when no config file or API config is provided. */
export const DEFAULT_OBFUSCATION_CONFIG: ObfuscationConfig = {
    log_level: "info",
    features: {
        obfuscate: {
            strings: true,
            numbers: true,
            booleans: true,
        },
        randomized_unique_identifiers: true,
        unnecessary_depth: false,
        dead_code_injection: false,
        control_flow_flattening: false,
        functionify: false,
    },
    options: {
        minify: true,
        boolean_number: null,
        number_offset: null,
        number_operator: null,
    },
};
