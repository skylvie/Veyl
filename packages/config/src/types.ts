export type NumberObfuscationOperator = "+" | "-" | "*" | "/";
export type NumberObfuscationOperatorFamily = "+-" | "*/";
export type NumberObfuscationMethod = "offset" | "equation";
export type BooleanObfuscationMethod = "number" | "depth";
export type StringObfuscationMethod = "array" | "split";
export type LogLevel = "none" | "error" | "info" | "debug";

export interface ObfuscationConfig {
    log_level: LogLevel;
    minify: boolean;
    obfuscate: {
        strings: {
            enabled: boolean;
            encode: boolean;
            unicode_escape_sequence: boolean;
            method: StringObfuscationMethod;
            split_length: number;
        };
        numbers: {
            enabled: boolean;
            method: NumberObfuscationMethod;
            offset: number | null;
            operator: NumberObfuscationOperatorFamily | null;
        };
        booleans: {
            enabled: boolean;
            method: BooleanObfuscationMethod;
            number: number | null;
            depth: number | "randomized" | null;
        };
    };
    features: {
        randomized_unique_identifiers: boolean;
        unnecessary_depth: boolean;
        dead_code_injection: boolean;
        control_flow_flattening: boolean;
        simplify: boolean;
        functionify: boolean;
    };
}

export type ObfuscationConfigInput = Partial<{
    log_level: LogLevel;
    minify: boolean;
    obfuscate: Partial<{
        strings: Partial<{
            enabled: boolean;
            encode: boolean;
            unicode_escape_sequence: boolean;
            method: StringObfuscationMethod;
            split_length: number;
        }>;
        numbers: Partial<{
            enabled: boolean;
            method: NumberObfuscationMethod;
            offset: number | null;
            operator: NumberObfuscationOperatorFamily | null;
        }>;
        booleans: Partial<{
            enabled: boolean;
            method: BooleanObfuscationMethod;
            number: number | null;
            depth: number | "randomized" | null;
        }>;
    }>;
    features: Partial<{
        randomized_unique_identifiers: boolean;
        unnecessary_depth: boolean;
        dead_code_injection: boolean;
        control_flow_flattening: boolean;
        simplify: boolean;
        functionify: boolean;
    }>;
}>;
