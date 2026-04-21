import { DEFAULT_OBFUSCATION_CONFIG } from "./defaults.js";
import {
    isLogLevel,
    isNumberObfuscationOperatorFamily,
    isStringObfuscationMethod,
} from "./guards.js";
import type { ObfuscationConfig, ObfuscationConfigInput } from "./types.js";

export function resolveConfig(input?: ObfuscationConfigInput): ObfuscationConfig {
    const merged: ObfuscationConfig = {
        log_level: input?.log_level ?? DEFAULT_OBFUSCATION_CONFIG.log_level,
        minify: input?.minify ?? DEFAULT_OBFUSCATION_CONFIG.minify,
        obfuscate: {
            strings: {
                enabled:
                    input?.obfuscate?.strings?.enabled ??
                    DEFAULT_OBFUSCATION_CONFIG.obfuscate.strings.enabled,
                encode:
                    input?.obfuscate?.strings?.encode ??
                    DEFAULT_OBFUSCATION_CONFIG.obfuscate.strings.encode,
                method:
                    input?.obfuscate?.strings?.method ??
                    DEFAULT_OBFUSCATION_CONFIG.obfuscate.strings.method,
                split_length:
                    input?.obfuscate?.strings?.split_length ??
                    DEFAULT_OBFUSCATION_CONFIG.obfuscate.strings.split_length,
            },
            numbers: {
                enabled:
                    input?.obfuscate?.numbers?.enabled ??
                    DEFAULT_OBFUSCATION_CONFIG.obfuscate.numbers.enabled,
                offset:
                    input?.obfuscate?.numbers?.offset ??
                    DEFAULT_OBFUSCATION_CONFIG.obfuscate.numbers.offset,
                operator:
                    input?.obfuscate?.numbers?.operator ??
                    DEFAULT_OBFUSCATION_CONFIG.obfuscate.numbers.operator,
            },
            booleans: {
                enabled:
                    input?.obfuscate?.booleans?.enabled ??
                    DEFAULT_OBFUSCATION_CONFIG.obfuscate.booleans.enabled,
                number:
                    input?.obfuscate?.booleans?.number ??
                    DEFAULT_OBFUSCATION_CONFIG.obfuscate.booleans.number,
            },
        },
        features: {
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
    };

    validateConfig(merged);
    return merged;
}

export function mergeConfig(
    base: ObfuscationConfigInput,
    override: ObfuscationConfigInput
): ObfuscationConfigInput {
    return {
        log_level: override.log_level ?? base.log_level,
        minify: override.minify ?? base.minify,
        obfuscate: {
            strings: {
                ...base.obfuscate?.strings,
                ...override.obfuscate?.strings,
            },
            numbers: {
                ...base.obfuscate?.numbers,
                ...override.obfuscate?.numbers,
            },
            booleans: {
                ...base.obfuscate?.booleans,
                ...override.obfuscate?.booleans,
            },
        },
        features: {
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
    };
}

function validateConfig(config: ObfuscationConfig): void {
    if (!isLogLevel(config.log_level)) {
        throw new Error("log_level must be one of none, error, info, or debug");
    }

    if (typeof config.minify !== "boolean") {
        throw new Error("minify must be true or false");
    }

    if (typeof config.obfuscate.strings.enabled !== "boolean") {
        throw new Error("obfuscate.strings.enabled must be true or false");
    }

    if (typeof config.obfuscate.strings.encode !== "boolean") {
        throw new Error("obfuscate.strings.encode must be true or false");
    }

    if (!isStringObfuscationMethod(config.obfuscate.strings.method)) {
        throw new Error('obfuscate.strings.method must be "array" or "split"');
    }

    if (
        !Number.isInteger(config.obfuscate.strings.split_length) ||
        config.obfuscate.strings.split_length <= 0
    ) {
        throw new Error("obfuscate.strings.split_length must be a positive integer");
    }

    if (typeof config.obfuscate.numbers.enabled !== "boolean") {
        throw new Error("obfuscate.numbers.enabled must be true or false");
    }

    if (
        config.obfuscate.numbers.offset !== null &&
        (!Number.isFinite(config.obfuscate.numbers.offset) || config.obfuscate.numbers.offset === 0)
    ) {
        throw new Error("obfuscate.numbers.offset must be a finite non-zero number");
    }

    if (
        config.obfuscate.numbers.operator !== null &&
        !isNumberObfuscationOperatorFamily(config.obfuscate.numbers.operator)
    ) {
        throw new Error('obfuscate.numbers.operator must be one of "+-", "*/", or null');
    }

    if (typeof config.obfuscate.booleans.enabled !== "boolean") {
        throw new Error("obfuscate.booleans.enabled must be true or false");
    }

    if (
        config.obfuscate.booleans.number !== null &&
        !Number.isFinite(config.obfuscate.booleans.number)
    ) {
        throw new Error("obfuscate.booleans.number must be a finite number");
    }

    if (typeof config.features.randomized_unique_identifiers !== "boolean") {
        throw new Error("features.randomized_unique_identifiers must be true or false");
    }

    if (typeof config.features.unnecessary_depth !== "boolean") {
        throw new Error("features.unnecessary_depth must be true or false");
    }

    if (typeof config.features.dead_code_injection !== "boolean") {
        throw new Error("features.dead_code_injection must be true or false");
    }

    if (typeof config.features.control_flow_flattening !== "boolean") {
        throw new Error("features.control_flow_flattening must be true or false");
    }

    if (typeof config.features.simplify !== "boolean") {
        throw new Error("features.simplify must be true or false");
    }

    if (typeof config.features.functionify !== "boolean") {
        throw new Error("features.functionify must be true or false");
    }
}
