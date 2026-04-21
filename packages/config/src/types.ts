export type NumberObfuscationOperator = "+" | "-" | "*" | "/";
export type NumberObfuscationOperatorFamily = "+-" | "*/";
export type StringObfuscationMethod = "array" | "split";
export type LogLevel = "none" | "error" | "info" | "debug";

export interface ObfuscationConfig {
    log_level: LogLevel;
    minify: boolean;
    obfuscate: {
        strings: {
            enabled: boolean;
            encode: boolean;
            method: StringObfuscationMethod;
            split_length: number;
        };
        numbers: {
            enabled: boolean;
            offset: number | null;
            operator: NumberObfuscationOperatorFamily | null;
        };
        booleans: {
            enabled: boolean;
            number: number | null;
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
            method: StringObfuscationMethod;
            split_length: number;
        }>;
        numbers: Partial<{
            enabled: boolean;
            offset: number | null;
            operator: NumberObfuscationOperatorFamily | null;
        }>;
        booleans: Partial<{
            enabled: boolean;
            number: number | null;
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
