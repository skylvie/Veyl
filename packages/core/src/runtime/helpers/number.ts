import type { NumberObfuscationOperator } from "@skylvi/veyl-config";
import * as t from "@babel/types";

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

    throw new Error(`Unsupported number operator: ${operator}`);
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

    throw new Error(`Unsupported number operator: ${operator}`);
}
