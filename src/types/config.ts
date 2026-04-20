export type NumberObfuscationOperator = "+" | "-" | "*" | "/";
export type LogLevel = "none" | "error" | "info" | "debug";

export interface ObfuscationConfig {
    log_level: LogLevel;
    features: {
        obfuscate: {
            strings: boolean;
            numbers: boolean;
            booleans: boolean;
        };
        randomized_unique_identifiers: boolean;
        unnecessary_depth: boolean;
    };
    options: {
        boolean_number: number | null;
        number_offset: number | null;
        number_operator: NumberObfuscationOperator | null;
    };
}

export type ObfuscationConfigInput = Partial<{
    log_level: LogLevel;
    features: Partial<{
        obfuscate: Partial<{
            strings: boolean;
            numbers: boolean;
            booleans: boolean;
        }>;
        randomized_unique_identifiers: boolean;
        unnecessary_depth: boolean;
    }>;
    options: Partial<{
        boolean_number: number | null;
        number_offset: number | null;
        number_operator: NumberObfuscationOperator | null;
    }>;
}>;
