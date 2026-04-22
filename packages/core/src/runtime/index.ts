import type * as t from "@babel/types";
import type { RuntimeHelperOptions } from "../types/runtime.js";
import { buildBooleanRuntimeHelper } from "./helpers/boolean.js";
import { buildNumberRuntimeHelper } from "./helpers/number.js";
import { buildStringRuntimeHelpers, buildStringTableRuntimeHelpers } from "./helpers/string.js";

export { insertHelperStatements } from "./helpers/insert.js";

// Builds the runtime decoder helpers injected into the obfuscated AST
export function buildRuntimeHelpers(options: RuntimeHelperOptions): t.Statement[] {
    const statements: t.Statement[] = [];

    if (options.strings !== undefined) {
        if (options.strings.method === "array") {
            if (
                options.strings.tableName === undefined ||
                options.strings.accessorName === undefined ||
                options.strings.encodedTable === undefined
            ) {
                throw new Error("string array runtime helpers require table metadata");
            }

            statements.push(
                ...buildStringTableRuntimeHelpers(
                    options.strings.tableName,
                    options.strings.accessorName,
                    options.strings.decoderName,
                    options.strings.encodedTable,
                    options.strings.orderTable ?? [],
                    options.strings.encode,
                    options.strings.unicodeEscapeSequence
                )
            );
        }

        if (options.strings.encode) {
            statements.push(
                ...buildStringRuntimeHelpers(options.strings.decoderName, options.strings.xorKey)
            );
        }
    }

    if (options.numbers !== undefined) {
        statements.push(
            buildNumberRuntimeHelper(
                options.numbers.decoderName,
                options.numbers.allowedOperators,
                options.numbers.offset
            )
        );
    }

    if (options.booleans !== undefined) {
        statements.push(
            buildBooleanRuntimeHelper(options.booleans.decoderName, options.booleans.trueToken)
        );
    }

    return statements;
}
