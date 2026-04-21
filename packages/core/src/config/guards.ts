import type {
    LogLevel,
    NumberObfuscationOperator,
    StringObfuscationMethod,
} from "../types/config.js";

export function isLogLevel(input: unknown): input is LogLevel {
    return input === "none" || input === "error" || input === "info" || input === "debug";
}

export function isNumberObfuscationOperator(input: unknown): input is NumberObfuscationOperator {
    return input === "+" || input === "-" || input === "*" || input === "/";
}

export function isStringObfuscationMethod(input: unknown): input is StringObfuscationMethod {
    return input === "array" || input === "split";
}

export function isPlainObject(input: unknown): input is Record<string, unknown> {
    return typeof input === "object" && input !== null && !Array.isArray(input);
}
