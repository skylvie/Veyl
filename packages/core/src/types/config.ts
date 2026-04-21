/** Operators Veyl can use when encoding numeric literals. */
export type NumberObfuscationOperator = "+" | "-" | "*" | "/";

/** CLI/package logging verbosity. */
export type LogLevel = "none" | "error" | "info" | "debug";

/** Fully resolved Veyl configuration with defaults filled in. */
export interface ObfuscationConfig {
    /** Controls CLI output. The programmatic API does not log by itself. */
    log_level: LogLevel;
    features: {
        obfuscate: {
            /** Replace string literals with runtime-decoded string table lookups. */
            strings: boolean;
            /** Replace number literals with runtime-decoded numeric expressions. */
            numbers: boolean;
            /** Replace boolean literals with runtime-decoded numeric token checks. */
            booleans: boolean;
        };
        /** Rename local identifiers/properties with randomized names when true. */
        randomized_unique_identifiers: boolean;
        /** Add extra local references before direct calls/constructors when true. */
        unnecessary_depth: boolean;
        /** Wrap the transformed program body in `new Function(...)` when true. */
        functionify: boolean;
    };
    options: {
        /** Run the final esbuild minify step on transformed output. */
        minify: boolean;
        /** Numeric token used to represent `true`, or null to randomize. */
        boolean_number: number | null;
        /** Numeric offset used for number obfuscation, or null to randomize. */
        number_offset: number | null;
        /** Numeric encoding operator, or null to randomize one compatible operator family. */
        number_operator: NumberObfuscationOperator | null;
    };
}

/**
 * Partial user-supplied Veyl configuration.
 *
 * Omitted values are filled from Veyl defaults. Use `null` for randomized
 * numeric options.
 */
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
        functionify: boolean;
    }>;
    options: Partial<{
        minify: boolean;
        boolean_number: number | null;
        number_offset: number | null;
        number_operator: NumberObfuscationOperator | null;
    }>;
}>;
