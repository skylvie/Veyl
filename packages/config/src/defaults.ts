import type { ObfuscationConfig } from "./types.js";

export const DEFAULT_CONFIG_FILE = "veyl_config.json";

export const DEFAULT_OBFUSCATION_CONFIG: ObfuscationConfig = {
    log_level: "info",
    minify: true,
    obfuscate: {
        strings: {
            enabled: true,
            encode: true,
            method: "array",
            split_length: 3,
        },
        numbers: {
            enabled: true,
            method: "offset",
            offset: null,
            operator: null,
        },
        booleans: {
            enabled: true,
            number: null,
        },
    },
    features: {
        randomized_unique_identifiers: true,
        unnecessary_depth: false,
        dead_code_injection: false,
        control_flow_flattening: false,
        simplify: false,
        functionify: false,
    },
};
