import type { NumberObfuscationOperator } from "./config.js";

export interface RuntimeHelperOptions {
    strings?: {
        method: "array" | "split";
        decoderName: string;
        tableName?: string;
        accessorName?: string;
        encodedTable?: string[][];
        xorKey: number;
    };
    numbers?: {
        decoderName: string;
        allowedOperators: readonly NumberObfuscationOperator[];
        offset: number;
    };
    booleans?: {
        decoderName: string;
        trueToken: number;
    };
}
