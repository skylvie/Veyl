import type { NumberObfuscationOperator } from "./config.js";

export interface RuntimeHelperOptions {
    strings?: {
        tableName: string;
        accessorName: string;
        decoderName: string;
        encodedTable: string[][];
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
