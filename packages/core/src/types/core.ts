import type { NumberObfuscationOperator, ObfuscationConfigInput } from "@skylvi/veyl-config";

/** Result from Veyl's internal esbuild bundling step. */
export interface BundleResult {
    /** Bundled JavaScript source. */
    code: string;
    /** Bundled source size in bytes. */
    bytes: number;
}

/** Options for `obfuscateFile`. */
export interface ObfuscateFileOptions {
    /** TypeScript or JavaScript entry file to bundle and obfuscate. */
    input: string;
    /** JavaScript file path where the obfuscated output will be written. */
    output: string;
    /** Optional Veyl config overrides. Omitted values use defaults. */
    config?: ObfuscationConfigInput;
}

/** Statistics returned after `obfuscateFile` writes output. */
export interface ObfuscationStats {
    /** Resolved input path. */
    input: string;
    /** Resolved output path. */
    output: string;
    /** Size of the bundled, pre-obfuscated code. */
    bundledBytes: number;
    /** Size of the final emitted code. */
    outputBytes: number;
    /** Number of bindings renamed by identifier obfuscation. */
    renamedBindings: number;
    /** Number of local property names renamed. */
    renamedProperties: number;
    /** Number of extra call/constructor references added. */
    addedDepthReferences: number;
    /** Number of unreachable dead-code blocks injected. */
    addedDeadCodeBlocks: number;
    /** Number of statement sequences rewritten as flattened dispatcher blocks. */
    flattenedControlFlowBlocks: number;
    /** Number of source statements rewritten by the simplifier pass. */
    simplifiedStatements: number;
    /** Number of string literals obfuscated. */
    obfuscatedStrings: number;
    /** Number of number literals obfuscated. */
    obfuscatedNumbers: number;
    /** Number of boolean literals obfuscated. */
    obfuscatedBooleans: number;
    /** Actual numeric token used for `true`, or null when boolean obfuscation was disabled. */
    booleanObfuscationNumber: number | null;
    /** Actual offset used for number obfuscation, or null when number obfuscation was disabled. */
    numberObfuscationOffset: number | null;
    /** Actual number operator or operator family used for number obfuscation. */
    numberObfuscationOperators: NumberObfuscationOperator[];
    /** Total runtime in milliseconds. */
    elapsedMs: number;
}

/** Result returned by `obfuscateCode`. */
export interface ObfuscateCodeResult {
    /** Obfuscated JavaScript source. */
    code: string;
    /** Number of bindings renamed by identifier obfuscation. */
    renamedBindings: number;
    /** Number of local property names renamed. */
    renamedProperties: number;
    /** Number of extra call/constructor references added. */
    addedDepthReferences: number;
    /** Number of unreachable dead-code blocks injected. */
    addedDeadCodeBlocks: number;
    /** Number of statement sequences rewritten as flattened dispatcher blocks. */
    flattenedControlFlowBlocks: number;
    /** Number of source statements rewritten by the simplifier pass. */
    simplifiedStatements: number;
    /** Number of string literals obfuscated. */
    obfuscatedStrings: number;
    /** Number of number literals obfuscated. */
    obfuscatedNumbers: number;
    /** Number of boolean literals obfuscated. */
    obfuscatedBooleans: number;
    /** Actual numeric token used for `true`, or null when boolean obfuscation was disabled. */
    booleanObfuscationNumber: number | null;
    /** Actual offset used for number obfuscation, or null when number obfuscation was disabled. */
    numberObfuscationOffset: number | null;
    /** Actual number operator or operator family used for number obfuscation. */
    numberObfuscationOperators: NumberObfuscationOperator[];
}
