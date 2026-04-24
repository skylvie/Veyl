import type { RuntimeHelperOptions } from "../types/runtime.js";

export function renameRuntimeBindingNames(
    runtimeOptions: RuntimeHelperOptions,
    renamedBindings: ReadonlyMap<string, string>
): void {
    if (runtimeOptions.strings !== undefined) {
        runtimeOptions.strings.decoderName =
            renamedBindings.get(runtimeOptions.strings.decoderName) ??
            runtimeOptions.strings.decoderName;
        runtimeOptions.strings.tableName =
            runtimeOptions.strings.tableName === undefined
                ? undefined
                : (renamedBindings.get(runtimeOptions.strings.tableName) ??
                  runtimeOptions.strings.tableName);
        runtimeOptions.strings.orderTableName =
            runtimeOptions.strings.orderTableName === undefined
                ? undefined
                : (renamedBindings.get(runtimeOptions.strings.orderTableName) ??
                  runtimeOptions.strings.orderTableName);
        runtimeOptions.strings.accessorName =
            runtimeOptions.strings.accessorName === undefined
                ? undefined
                : (renamedBindings.get(runtimeOptions.strings.accessorName) ??
                  runtimeOptions.strings.accessorName);
    }

    if (runtimeOptions.numbers !== undefined) {
        runtimeOptions.numbers.decoderName =
            renamedBindings.get(runtimeOptions.numbers.decoderName) ??
            runtimeOptions.numbers.decoderName;
    }

    if (runtimeOptions.booleans !== undefined) {
        runtimeOptions.booleans.decoderName =
            renamedBindings.get(runtimeOptions.booleans.decoderName) ??
            runtimeOptions.booleans.decoderName;
    }
}
