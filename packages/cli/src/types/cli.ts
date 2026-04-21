import type { ObfuscationConfigInput } from "@skylvi/veyl";

export interface CliOptions {
    input: string;
    output: string;
    configFile: string | null;
    configOverrides: ObfuscationConfigInput;
}

export interface LoadedConfig {
    input: ObfuscationConfigInput;
    source: string;
}
