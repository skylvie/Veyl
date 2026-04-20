import { buildBooleanRuntimeHelper } from "./helpers/boolean.js";
import { buildNumberRuntimeHelper } from "./helpers/number.js";
import { buildStringRuntimeHelpers } from "./helpers/string.js";
import * as t from "@babel/types";

export type NumberOperatorFamily = "additive" | "multiplicative";
export { insertHelperStatements } from "./helpers/insert.js";

// Builds the runtime decoder helpers injected into the obfuscated AST
export function buildRuntimeHelpers(
    stringTableName: string,
    stringAccessorName: string,
    stringDecoderName: string,
    encodedTable: string[][],
    stringXorKey: number,
    numberDecoderName: string,
    numberFamily: NumberOperatorFamily,
    numberShift: number,
    boolDecoderName: string,
    trueToken: number,
): t.Statement[] {
    return [
        ...buildStringRuntimeHelpers(
            stringTableName,
            stringAccessorName,
            stringDecoderName,
            encodedTable,
            stringXorKey,
        ),
        buildNumberRuntimeHelper(
            numberDecoderName,
            numberFamily,
            numberShift,
        ),
        buildBooleanRuntimeHelper(
            boolDecoderName,
            trueToken,
        ),
    ];
}
