import type { NumberOperatorFamily } from "../index.js";
import * as t from "@babel/types";

export function buildNumberRuntimeHelper(
    numberDecoderName: string,
    numberFamily: NumberOperatorFamily,
    numberShift: number,
): t.Statement {
    const numberDecoderStatements = numberFamily === "additive"
        ? [
            t.ifStatement(
                t.binaryExpression("===", t.identifier("op"), t.numericLiteral(0)),
                t.blockStatement([
                    t.returnStatement(
                        t.binaryExpression("-", t.identifier("value"), t.numericLiteral(numberShift)),
                    ),
                ]),
            ),
            t.ifStatement(
                t.binaryExpression("===", t.identifier("op"), t.numericLiteral(1)),
                t.blockStatement([
                    t.returnStatement(
                        t.binaryExpression("+", t.identifier("value"), t.numericLiteral(numberShift)),
                    ),
                ]),
            ),
            t.returnStatement(
                t.binaryExpression("+", t.identifier("value"), t.numericLiteral(numberShift)),
            ),
        ]
        : [
            t.ifStatement(
                t.binaryExpression("===", t.identifier("op"), t.numericLiteral(2)),
                t.blockStatement([
                    t.returnStatement(
                        t.binaryExpression("/", t.identifier("value"), t.numericLiteral(numberShift)),
                    ),
                ]),
            ),
            t.returnStatement(
                t.binaryExpression("*", t.identifier("value"), t.numericLiteral(numberShift)),
            ),
        ];

    return t.functionDeclaration(
        t.identifier(numberDecoderName),
        [t.identifier("value"), t.identifier("op")],
        t.blockStatement(numberDecoderStatements),
    );
}
