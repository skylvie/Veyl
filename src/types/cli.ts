import type { ObfuscationConfigInput } from "./config.js";

export interface CliOptions {
    input: string;
    output: string;
    configFile: string | null;
    configOverrides: ObfuscationConfigInput;
    help: boolean;
}

export interface CliOptionDefinition {
    flags: string[];
    target: string;
    takesValue: boolean;
    valueName?: string;
    required: boolean;
    description: string;
}

export interface LoadedConfig {
    input: ObfuscationConfigInput;
    source: string;
}
