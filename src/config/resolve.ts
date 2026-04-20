import type { ObfuscationConfig, ObfuscationConfigInput } from "../types/config.js";
import { DEFAULT_OBFUSCATION_CONFIG } from "./defaults.js";
import { isLogLevel, isNumberObfuscationOperator } from "./guards.js";

/**
 * Fills a partial user config with Veyl defaults and validates the result.
 */
export function resolveConfig(input?: ObfuscationConfigInput): ObfuscationConfig {
    const merged: ObfuscationConfig = {
        log_level: input?.log_level ?? DEFAULT_OBFUSCATION_CONFIG.log_level,
        features: {
            obfuscate: {
                strings: input?.features?.obfuscate?.strings ?? DEFAULT_OBFUSCATION_CONFIG.features.obfuscate.strings,
                numbers: input?.features?.obfuscate?.numbers ?? DEFAULT_OBFUSCATION_CONFIG.features.obfuscate.numbers,
                booleans: input?.features?.obfuscate?.booleans ?? DEFAULT_OBFUSCATION_CONFIG.features.obfuscate.booleans,
            },
            randomized_unique_identifiers: input?.features?.randomized_unique_identifiers ??
                DEFAULT_OBFUSCATION_CONFIG.features.randomized_unique_identifiers,
            unnecessary_depth: input?.features?.unnecessary_depth ?? DEFAULT_OBFUSCATION_CONFIG.features.unnecessary_depth,
        },
        options: {
            boolean_number: input?.options?.boolean_number ?? DEFAULT_OBFUSCATION_CONFIG.options.boolean_number,
            number_offset: input?.options?.number_offset ?? DEFAULT_OBFUSCATION_CONFIG.options.number_offset,
            number_operator: input?.options?.number_operator ?? DEFAULT_OBFUSCATION_CONFIG.options.number_operator,
        },
    };

    validateConfig(merged);

    return merged;
}

/**
 * Deep-merges two partial configs.
 *
 * Values in `override` take precedence over `base`, which is useful for
 * applying CLI flags on top of config file values.
 */
export function mergeConfig(
    base: ObfuscationConfigInput,
    override: ObfuscationConfigInput,
): ObfuscationConfigInput {
    return {
        log_level: override.log_level ?? base.log_level,
        features: {
            obfuscate: {
                ...base.features?.obfuscate,
                ...override.features?.obfuscate,
            },
            randomized_unique_identifiers: override.features?.randomized_unique_identifiers ??
                base.features?.randomized_unique_identifiers,
            unnecessary_depth: override.features?.unnecessary_depth ?? base.features?.unnecessary_depth,
        },
        options: {
            ...base.options,
            ...override.options,
        },
    };
}

function validateConfig(config: ObfuscationConfig): void {
    const booleanNumber = config.options.boolean_number;
    const numberOffset = config.options.number_offset;
    const numberOperator = config.options.number_operator;

    if (!isLogLevel(config.log_level)) {
        throw new Error("log_level must be one of none, error, info, or debug");
    }

    if (booleanNumber !== null && !Number.isFinite(booleanNumber)) {
        throw new Error("options.boolean_number must be a finite number");
    }

    if (numberOffset !== null && (!Number.isFinite(numberOffset) || numberOffset === 0)) {
        throw new Error("options.number_offset must be a finite non-zero number");
    }

    if (numberOperator !== null && !isNumberObfuscationOperator(numberOperator)) {
        throw new Error('options.number_operator must be one of "+", "-", "*", "/", or null');
    }
}
