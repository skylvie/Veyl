import * as t from "@babel/types";

export function buildBooleanRuntimeHelper(boolDecoderName: string, trueToken: number): t.Statement {
    return t.functionDeclaration(
        t.identifier(boolDecoderName),
        [t.identifier("value")],
        t.blockStatement([
            t.returnStatement(
                t.binaryExpression("===", t.identifier("value"), t.numericLiteral(trueToken))
            ),
        ])
    );
}
