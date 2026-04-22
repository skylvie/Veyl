import type { NumberObfuscationOperator } from "@skylvi/veyl-config";

export interface RuntimeHelperOptions {
    strings?: {
        method: "array" | "split";
        encode: boolean;
        unicodeEscapeSequence: boolean;
        decoderName: string;
        tableName?: string;
        accessorName?: string;
        encodedTable?: string[][];
        orderTable?: number[][];
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
