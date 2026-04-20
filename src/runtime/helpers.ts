import * as t from "@babel/types";
import type { BabelNode } from "../babel/interop.js";

// Inject string, number, and boolean decoder functions into the AST
export function buildRuntimeHelpers(
    stringAccessorName: string,
    stringDecoderName: string,
    encodedTable: string[],
    stringXorKey: number,
    numberDecoderName: string,
    numberOp: "+" | "-" | "*",
    numberShift: number,
    boolDecoderName: string,
    trueToken: number,
): t.Statement[] {
    const tableElements = encodedTable.map((value) => t.stringLiteral(value));

    const stringAccessorFn = t.functionDeclaration(
        t.identifier(stringAccessorName),
        [t.identifier("index")],
        t.blockStatement([
            t.variableDeclaration("const", [
                t.variableDeclarator(
                    t.identifier("table"),
                    t.arrayExpression(tableElements),
                ),
            ]),
            t.returnStatement(
                t.memberExpression(
                    t.identifier("table"),
                    t.identifier("index"),
                    true,
                ),
            ),
        ]),
    );

    const stringDecoderFn = t.functionDeclaration(
        t.identifier(stringDecoderName),
        [t.identifier("inp")],
        t.blockStatement([
            t.variableDeclaration("const", [
                t.variableDeclarator(
                    t.identifier("alphabet"),
                    t.stringLiteral("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"),
                ),
            ]),
            t.variableDeclaration("let", [
                t.variableDeclarator(
                    t.identifier("end"),
                    t.memberExpression(t.identifier("inp"), t.identifier("length")),
                ),
            ]),
            t.whileStatement(
                t.logicalExpression(
                    "&&",
                    t.binaryExpression(">", t.identifier("end"), t.numericLiteral(0)),
                    t.binaryExpression(
                        "===",
                        t.memberExpression(
                            t.identifier("inp"),
                            t.binaryExpression("-", t.identifier("end"), t.numericLiteral(1)),
                            true,
                        ),
                        t.stringLiteral("="),
                    ),
                ),
                t.blockStatement([
                    t.expressionStatement(
                        t.updateExpression("--", t.identifier("end")),
                    ),
                ]),
            ),
            t.variableDeclaration("const", [
                t.variableDeclarator(
                    t.identifier("cleaned"),
                    t.callExpression(
                        t.memberExpression(t.identifier("inp"), t.identifier("slice")),
                        [t.numericLiteral(0), t.identifier("end")],
                    ),
                ),
            ]),
            t.variableDeclaration("const", [
                t.variableDeclarator(
                    t.identifier("bytes"),
                    t.arrayExpression([]),
                ),
            ]),
            t.variableDeclaration("let", [
                t.variableDeclarator(t.identifier("buffer"), t.numericLiteral(0)),
            ]),
            t.variableDeclaration("let", [
                t.variableDeclarator(t.identifier("bits"), t.numericLiteral(0)),
            ]),
            t.forStatement(
                t.variableDeclaration("let", [
                    t.variableDeclarator(t.identifier("i"), t.numericLiteral(0)),
                ]),
                t.binaryExpression("<", t.identifier("i"), t.memberExpression(t.identifier("cleaned"), t.identifier("length"))),
                t.updateExpression("++", t.identifier("i")),
                t.blockStatement([
                    t.variableDeclaration("const", [
                        t.variableDeclarator(
                            t.identifier("ch"),
                            t.memberExpression(t.identifier("cleaned"), t.identifier("i"), true),
                        ),
                    ]),
                    t.variableDeclaration("const", [
                        t.variableDeclarator(
                            t.identifier("idx"),
                            t.callExpression(
                                t.memberExpression(t.identifier("alphabet"), t.identifier("indexOf")),
                                [t.identifier("ch")],
                            ),
                        ),
                    ]),
                    t.ifStatement(
                        t.binaryExpression("<", t.identifier("idx"), t.numericLiteral(0)),
                        t.blockStatement([
                            t.continueStatement(),
                        ]),
                    ),
                    t.expressionStatement(
                        t.assignmentExpression(
                            "=",
                            t.identifier("buffer"),
                            t.binaryExpression(
                                "|",
                                t.binaryExpression("<<", t.identifier("buffer"), t.numericLiteral(6)),
                                t.identifier("idx"),
                            ),
                        ),
                    ),
                    t.expressionStatement(
                        t.assignmentExpression(
                            "=",
                            t.identifier("bits"),
                            t.binaryExpression("+", t.identifier("bits"), t.numericLiteral(6)),
                        ),
                    ),
                    t.whileStatement(
                        t.binaryExpression(">=", t.identifier("bits"), t.numericLiteral(8)),
                        t.blockStatement([
                            t.expressionStatement(
                                t.assignmentExpression(
                                    "=",
                                    t.identifier("bits"),
                                    t.binaryExpression("-", t.identifier("bits"), t.numericLiteral(8)),
                                ),
                            ),
                            t.expressionStatement(
                                t.callExpression(
                                    t.memberExpression(t.identifier("bytes"), t.identifier("push")),
                                    [
                                        t.binaryExpression(
                                            "&",
                                            t.binaryExpression(
                                                ">>",
                                                t.identifier("buffer"),
                                                t.identifier("bits"),
                                            ),
                                            t.numericLiteral(0xff),
                                        ),
                                    ],
                                ),
                            ),
                        ]),
                    ),
                ]),
            ),
            t.forStatement(
                t.variableDeclaration("let", [
                    t.variableDeclarator(t.identifier("i"), t.numericLiteral(0)),
                ]),
                t.binaryExpression("<", t.identifier("i"), t.memberExpression(t.identifier("bytes"), t.identifier("length"))),
                t.updateExpression("++", t.identifier("i")),
                t.blockStatement([
                    t.variableDeclaration("const", [
                        t.variableDeclarator(
                            t.identifier("rotated"),
                            t.binaryExpression(
                                "|",
                                t.binaryExpression(
                                    ">>>",
                                    t.memberExpression(t.identifier("bytes"), t.identifier("i"), true),
                                    t.numericLiteral(2),
                                ),
                                t.binaryExpression(
                                    "<<",
                                    t.binaryExpression(
                                        "&",
                                        t.memberExpression(t.identifier("bytes"), t.identifier("i"), true),
                                        t.numericLiteral(0x03),
                                    ),
                                    t.numericLiteral(6),
                                ),
                            ),
                        ),
                    ]),
                    t.expressionStatement(
                        t.assignmentExpression(
                            "=",
                            t.memberExpression(t.identifier("bytes"), t.identifier("i"), true),
                            t.binaryExpression(
                                "&",
                                t.binaryExpression("^", t.identifier("rotated"), t.numericLiteral(stringXorKey)),
                                t.numericLiteral(0xff),
                            ),
                        ),
                    ),
                ]),
            ),
            t.returnStatement(
                t.callExpression(
                    t.memberExpression(
                        t.newExpression(t.identifier("TextDecoder"), []),
                        t.identifier("decode"),
                    ),
                    [
                        t.callExpression(
                            t.memberExpression(t.identifier("Uint8Array"), t.identifier("from")),
                            [t.identifier("bytes")],
                        ),
                    ],
                ),
            ),
        ]),
    );

    const numberOperator = numberOp === "+"
        ? "-"
        : numberOp === "-"
            ? "+"
            : "/";

    const numberDecoderFn = t.functionDeclaration(
        t.identifier(numberDecoderName),
        [t.identifier("value")],
        t.blockStatement([
            t.returnStatement(
                t.binaryExpression(numberOperator, t.identifier("value"), t.numericLiteral(numberShift)),
            ),
        ]),
    );

    const boolDecoderFn = t.functionDeclaration(
        t.identifier(boolDecoderName),
        [t.identifier("value")],
        t.blockStatement([
            t.returnStatement(
                t.binaryExpression("===", t.identifier("value"), t.numericLiteral(trueToken)),
            ),
        ]),
    );

    return [
        stringAccessorFn,
        stringDecoderFn,
        numberDecoderFn,
        boolDecoderFn,
    ];
}

export function insertHelperStatements(ast: object, helpers: t.Statement[]): void {
    const program = (ast as { program?: { body?: BabelNode[] } }).program;

    if (program?.body === undefined) {
        return;
    }

    let insertAt = 0;

    while (
        insertAt < program.body.length &&
        program.body[insertAt].type === "ImportDeclaration"
    ) {
        insertAt++;
    }

    program.body.splice(insertAt, 0, ...(helpers as unknown as BabelNode[]));
}
