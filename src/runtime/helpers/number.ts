import * as t from "@babel/types";
import type { NumberObfuscationOperator } from "../../types/config.js";

export function buildNumberRuntimeHelper(
    numberDecoderName: string,
    allowedOperators: readonly NumberObfuscationOperator[],
    numberShift: number
): t.Statement {
    const numberDecoderStatements: t.Statement[] = allowedOperators.map((operator) =>
        t.ifStatement(
            t.binaryExpression(
                "===",
                t.identifier("op"),
                t.numericLiteral(encodeNumberOperator(operator))
            ),
            t.blockStatement([
                t.returnStatement(
                    t.binaryExpression(
                        decodeNumberOperator(operator),
                        t.identifier("value"),
                        t.numericLiteral(numberShift)
                    )
                ),
            ])
        )
    );

    numberDecoderStatements.push(t.returnStatement(t.identifier("value")));

    return t.functionDeclaration(
        t.identifier(numberDecoderName),
        [t.identifier("value"), t.identifier("op")],
        t.blockStatement(numberDecoderStatements)
    );
}

function decodeNumberOperator(operator: NumberObfuscationOperator): NumberObfuscationOperator {
    switch (operator) {
        case "+":
            return "-";
        case "-":
            return "+";
        case "*":
            return "/";
        case "/":
            return "*";
    }
}

function encodeNumberOperator(operator: NumberObfuscationOperator): number {
    switch (operator) {
        case "+":
            return 0;
        case "-":
            return 1;
        case "*":
            return 2;
        case "/":
            return 3;
    }
}
