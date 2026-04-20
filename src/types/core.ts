import type { NumberObfuscationOperator, ObfuscationConfigInput } from "./config.js";

export interface BundleResult {
    code: string;
    bytes: number;
}

export interface ObfuscateFileOptions {
    input: string;
    output: string;
    config?: ObfuscationConfigInput;
}

export interface ObfuscationStats {
    input: string;
    output: string;
    bundledBytes: number;
    outputBytes: number;
    renamedBindings: number;
    renamedProperties: number;
    addedDepthReferences: number;
    obfuscatedStrings: number;
    obfuscatedNumbers: number;
    obfuscatedBooleans: number;
    booleanObfuscationNumber: number | null;
    numberObfuscationOffset: number | null;
    numberObfuscationOperators: NumberObfuscationOperator[];
    elapsedMs: number;
}

export interface ObfuscateCodeResult {
    code: string;
    renamedBindings: number;
    renamedProperties: number;
    addedDepthReferences: number;
    obfuscatedStrings: number;
    obfuscatedNumbers: number;
    obfuscatedBooleans: number;
    booleanObfuscationNumber: number | null;
    numberObfuscationOffset: number | null;
    numberObfuscationOperators: NumberObfuscationOperator[];
}
