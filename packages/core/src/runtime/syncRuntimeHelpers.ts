import * as t from "@babel/types";
import type { RuntimeHelperOptions } from "../types/runtime.js";
import { createStringLiteralNode } from "../utils/stringLiteral.js";

export function syncRuntimeHelpers(
    helpers: t.Statement[],
    runtimeOptions: RuntimeHelperOptions
): void {
    const stringRuntime = runtimeOptions.strings;

    if (
        stringRuntime === undefined ||
        stringRuntime.method !== "array" ||
        stringRuntime.tableName === undefined ||
        stringRuntime.orderTableName === undefined ||
        stringRuntime.encodedTable === undefined ||
        stringRuntime.orderTable === undefined
    ) {
        return;
    }

    const tableName = stringRuntime.tableName;
    const orderTableName = stringRuntime.orderTableName;
    const tableElements = stringRuntime.encodedTable.map((parts) =>
        t.arrayExpression(
            parts.map((value) =>
                createStringLiteralNode(value, stringRuntime.unicodeEscapeSequence)
            )
        )
    );
    const orderElements = stringRuntime.orderTable.map((parts) =>
        t.arrayExpression(parts.map((value) => t.numericLiteral(value)))
    );

    for (const helper of helpers) {
        if (!t.isVariableDeclaration(helper)) {
            continue;
        }

        for (const declaration of helper.declarations) {
            if (!t.isIdentifier(declaration.id)) {
                continue;
            }

            if (declaration.id.name === tableName) {
                declaration.init = t.arrayExpression(tableElements);
            }

            if (declaration.id.name === orderTableName) {
                declaration.init = t.arrayExpression(orderElements);
            }
        }
    }
}
