import type { NumberObfuscationOperator, ObfuscationConfig } from "@skylvi/veyl-config";
import type { LiteralObfuscationResult } from "../types/transforms.js";
import type { NameGenerator } from "../utils/random.js";
import { obfuscateBooleanLiterals } from "./literals/booleans.js";
import { obfuscateNumberLiterals } from "./literals/numbers.js";
import { obfuscateStringLiterals } from "./literals/strings.js";

// Replaces string, number, and boolean literals with runtime decoder calls
export function obfuscateLiterals(
    ast: object,
    names: NameGenerator,
    config: ObfuscationConfig
): LiteralObfuscationResult {
    const runtimeOptions: LiteralObfuscationResult["runtimeOptions"] = {};

    const stringCount = obfuscateStringLiterals(ast, names, config, runtimeOptions);
    const numberResult = obfuscateNumberLiterals(ast, names, config, runtimeOptions);
    const booleanResult = obfuscateBooleanLiterals(ast, names, config, runtimeOptions);

    return {
        runtimeOptions,
        stringCount,
        numberCount: numberResult.count,
        booleanCount: booleanResult.count,
        booleanNumber: booleanResult.trueToken,
        numberOffset: numberResult.offset,
        numberOperators: numberResult.operators as NumberObfuscationOperator[],
    };
}
