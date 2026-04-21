import type { ObfuscationConfig, ObfuscationConfigInput } from "../types/config.js";
import { DEFAULT_OBFUSCATION_CONFIG } from "./defaults.js";
import { isLogLevel, isNumberObfuscationOperator, isStringObfuscationMethod } from "./guards.js";

/**
 * Fills a partial user config with Veyl defaults and validates the result.
 */
export function resolveConfig(input?: ObfuscationConfigInput): ObfuscationConfig {
    const merged: ObfuscationConfig = {
        log_level: input?.log_level ?? DEFAULT_OBFUSCATION_CONFIG.log_level,
        features: {
            obfuscate: {
                strings:
                    input?.features?.obfuscate?.strings ??
                    DEFAULT_OBFUSCATION_CONFIG.features.obfuscate.strings,
                numbers:
                    input?.features?.obfuscate?.numbers ??
                    DEFAULT_OBFUSCATION_CONFIG.features.obfuscate.numbers,
                booleans:
                    input?.features?.obfuscate?.booleans ??
                    DEFAULT_OBFUSCATION_CONFIG.features.obfuscate.booleans,
            },
            randomized_unique_identifiers:
                input?.features?.randomized_unique_identifiers ??
                DEFAULT_OBFUSCATION_CONFIG.features.randomized_unique_identifiers,
            unnecessary_depth:
                input?.features?.unnecessary_depth ??
                DEFAULT_OBFUSCATION_CONFIG.features.unnecessary_depth,
            dead_code_injection:
                input?.features?.dead_code_injection ??
                DEFAULT_OBFUSCATION_CONFIG.features.dead_code_injection,
            control_flow_flattening:
                input?.features?.control_flow_flattening ??
                DEFAULT_OBFUSCATION_CONFIG.features.control_flow_flattening,
            simplify: input?.features?.simplify ?? DEFAULT_OBFUSCATION_CONFIG.features.simplify,
            functionify:
                input?.features?.functionify ?? DEFAULT_OBFUSCATION_CONFIG.features.functionify,
        },
        options: {
            minify: input?.options?.minify ?? DEFAULT_OBFUSCATION_CONFIG.options.minify,
            string_method:
                input?.options?.string_method ?? DEFAULT_OBFUSCATION_CONFIG.options.string_method,
            string_split_length:
                input?.options?.string_split_length ??
                DEFAULT_OBFUSCATION_CONFIG.options.string_split_length,
            boolean_number:
                input?.options?.boolean_number ?? DEFAULT_OBFUSCATION_CONFIG.options.boolean_number,
            number_offset:
                input?.options?.number_offset ?? DEFAULT_OBFUSCATION_CONFIG.options.number_offset,
            number_operator:
                input?.options?.number_operator ??
                DEFAULT_OBFUSCATION_CONFIG.options.number_operator,
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
    override: ObfuscationConfigInput
): ObfuscationConfigInput {
    return {
        log_level: override.log_level ?? base.log_level,
        features: {
            obfuscate: {
                ...base.features?.obfuscate,
                ...override.features?.obfuscate,
            },
            randomized_unique_identifiers:
                override.features?.randomized_unique_identifiers ??
                base.features?.randomized_unique_identifiers,
            unnecessary_depth:
                override.features?.unnecessary_depth ?? base.features?.unnecessary_depth,
            dead_code_injection:
                override.features?.dead_code_injection ?? base.features?.dead_code_injection,
            control_flow_flattening:
                override.features?.control_flow_flattening ??
                base.features?.control_flow_flattening,
            simplify: override.features?.simplify ?? base.features?.simplify,
            functionify: override.features?.functionify ?? base.features?.functionify,
        },
        options: {
            ...base.options,
            ...override.options,
        },
    };
}

function validateConfig(config: ObfuscationConfig): void {
    const functionify = config.features.functionify;
    const deadCodeInjection = config.features.dead_code_injection;
    const controlFlowFlattening = config.features.control_flow_flattening;
    const simplify = config.features.simplify;
    const minify = config.options.minify;
    const stringMethod = config.options.string_method;
    const stringSplitLength = config.options.string_split_length;
    const booleanNumber = config.options.boolean_number;
    const numberOffset = config.options.number_offset;
    const numberOperator = config.options.number_operator;

    if (!isLogLevel(config.log_level)) {
        throw new Error("log_level must be one of none, error, info, or debug");
    }

    if (typeof functionify !== "boolean") {
        throw new Error("features.functionify must be true or false");
    }

    if (typeof deadCodeInjection !== "boolean") {
        throw new Error("features.dead_code_injection must be true or false");
    }

    if (typeof controlFlowFlattening !== "boolean") {
        throw new Error("features.control_flow_flattening must be true or false");
    }

    if (typeof simplify !== "boolean") {
        throw new Error("features.simplify must be true or false");
    }

    if (typeof minify !== "boolean") {
        throw new Error("options.minify must be true or false");
    }

    if (!isStringObfuscationMethod(stringMethod)) {
        throw new Error('options.string_method must be "array" or "split"');
    }

    if (!Number.isInteger(stringSplitLength) || stringSplitLength <= 0) {
        throw new Error("options.string_split_length must be a positive integer");
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
