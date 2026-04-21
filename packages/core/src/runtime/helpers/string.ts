import * as t from "@babel/types";

export function buildStringRuntimeHelpers(
    stringDecoderName: string,
    stringXorKey: number
): t.Statement[] {
    const stringDecoderFn = t.functionDeclaration(
        t.identifier(stringDecoderName),
        [t.identifier("inp")],
        t.blockStatement([
            t.variableDeclaration("const", [
                t.variableDeclarator(
                    t.identifier("alphabet"),
                    t.stringLiteral(
                        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
                    )
                ),
            ]),
            t.variableDeclaration("let", [
                t.variableDeclarator(
                    t.identifier("end"),
                    t.memberExpression(t.identifier("inp"), t.identifier("length"))
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
                            true
                        ),
                        t.stringLiteral("=")
                    )
                ),
                t.blockStatement([
                    t.expressionStatement(t.updateExpression("--", t.identifier("end"))),
                ])
            ),
            t.variableDeclaration("const", [
                t.variableDeclarator(
                    t.identifier("cleaned"),
                    t.callExpression(
                        t.memberExpression(t.identifier("inp"), t.identifier("slice")),
                        [t.numericLiteral(0), t.identifier("end")]
                    )
                ),
            ]),
            t.variableDeclaration("const", [
                t.variableDeclarator(t.identifier("bytes"), t.arrayExpression([])),
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
                t.binaryExpression(
                    "<",
                    t.identifier("i"),
                    t.memberExpression(t.identifier("cleaned"), t.identifier("length"))
                ),
                t.updateExpression("++", t.identifier("i")),
                t.blockStatement([
                    t.variableDeclaration("const", [
                        t.variableDeclarator(
                            t.identifier("ch"),
                            t.memberExpression(t.identifier("cleaned"), t.identifier("i"), true)
                        ),
                    ]),
                    t.variableDeclaration("const", [
                        t.variableDeclarator(
                            t.identifier("idx"),
                            t.callExpression(
                                t.memberExpression(
                                    t.identifier("alphabet"),
                                    t.identifier("indexOf")
                                ),
                                [t.identifier("ch")]
                            )
                        ),
                    ]),
                    t.ifStatement(
                        t.binaryExpression("<", t.identifier("idx"), t.numericLiteral(0)),
                        t.blockStatement([t.continueStatement()])
                    ),
                    t.expressionStatement(
                        t.assignmentExpression(
                            "=",
                            t.identifier("buffer"),
                            t.binaryExpression(
                                "|",
                                t.binaryExpression(
                                    "<<",
                                    t.identifier("buffer"),
                                    t.numericLiteral(6)
                                ),
                                t.identifier("idx")
                            )
                        )
                    ),
                    t.expressionStatement(
                        t.assignmentExpression(
                            "=",
                            t.identifier("bits"),
                            t.binaryExpression("+", t.identifier("bits"), t.numericLiteral(6))
                        )
                    ),
                    t.whileStatement(
                        t.binaryExpression(">=", t.identifier("bits"), t.numericLiteral(8)),
                        t.blockStatement([
                            t.expressionStatement(
                                t.assignmentExpression(
                                    "=",
                                    t.identifier("bits"),
                                    t.binaryExpression(
                                        "-",
                                        t.identifier("bits"),
                                        t.numericLiteral(8)
                                    )
                                )
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
                                                t.identifier("bits")
                                            ),
                                            t.numericLiteral(0xff)
                                        ),
                                    ]
                                )
                            ),
                        ])
                    ),
                ])
            ),
            t.forStatement(
                t.variableDeclaration("let", [
                    t.variableDeclarator(t.identifier("i"), t.numericLiteral(0)),
                ]),
                t.binaryExpression(
                    "<",
                    t.identifier("i"),
                    t.memberExpression(t.identifier("bytes"), t.identifier("length"))
                ),
                t.updateExpression("++", t.identifier("i")),
                t.blockStatement([
                    t.variableDeclaration("const", [
                        t.variableDeclarator(
                            t.identifier("rotated"),
                            t.binaryExpression(
                                "|",
                                t.binaryExpression(
                                    ">>>",
                                    t.memberExpression(
                                        t.identifier("bytes"),
                                        t.identifier("i"),
                                        true
                                    ),
                                    t.numericLiteral(2)
                                ),
                                t.binaryExpression(
                                    "<<",
                                    t.binaryExpression(
                                        "&",
                                        t.memberExpression(
                                            t.identifier("bytes"),
                                            t.identifier("i"),
                                            true
                                        ),
                                        t.numericLiteral(0x03)
                                    ),
                                    t.numericLiteral(6)
                                )
                            )
                        ),
                    ]),
                    t.expressionStatement(
                        t.assignmentExpression(
                            "=",
                            t.memberExpression(t.identifier("bytes"), t.identifier("i"), true),
                            t.binaryExpression(
                                "&",
                                t.binaryExpression(
                                    "^",
                                    t.identifier("rotated"),
                                    t.numericLiteral(stringXorKey)
                                ),
                                t.numericLiteral(0xff)
                            )
                        )
                    ),
                ])
            ),
            t.returnStatement(
                t.callExpression(
                    t.memberExpression(
                        t.newExpression(t.identifier("TextDecoder"), []),
                        t.identifier("decode")
                    ),
                    [
                        t.callExpression(
                            t.memberExpression(t.identifier("Uint8Array"), t.identifier("from")),
                            [t.identifier("bytes")]
                        ),
                    ]
                )
            ),
        ])
    );

    return [stringDecoderFn];
}

export function buildStringTableRuntimeHelpers(
    stringTableName: string,
    stringAccessorName: string,
    stringDecoderName: string,
    encodedTable: string[][],
    orderTable: number[][],
    encode: boolean
): t.Statement[] {
    const tableElements = encodedTable.map((parts) =>
        t.arrayExpression(parts.map((value) => t.stringLiteral(value)))
    );
    const orderElements = orderTable.map((parts) =>
        t.arrayExpression(parts.map((value) => t.numericLiteral(value)))
    );

    const stringTableDeclaration = t.variableDeclaration("const", [
        t.variableDeclarator(t.identifier(stringTableName), t.arrayExpression(tableElements)),
    ]);
    const stringOrderDeclaration = t.variableDeclaration("const", [
        t.variableDeclarator(
            t.identifier(`${stringTableName}_o`),
            t.arrayExpression(orderElements)
        ),
    ]);

    const stringAccessorFn = t.functionDeclaration(
        t.identifier(stringAccessorName),
        [t.identifier("index")],
        t.blockStatement([
            t.variableDeclaration("const", [
                t.variableDeclarator(
                    t.identifier("parts"),
                    t.memberExpression(t.identifier(stringTableName), t.identifier("index"), true)
                ),
            ]),
            t.variableDeclaration("const", [
                t.variableDeclarator(
                    t.identifier("order"),
                    t.memberExpression(
                        t.identifier(`${stringTableName}_o`),
                        t.identifier("index"),
                        true
                    )
                ),
            ]),
            t.variableDeclaration("const", [
                t.variableDeclarator(
                    t.identifier("restored"),
                    t.newExpression(t.identifier("Array"), [
                        t.memberExpression(t.identifier("parts"), t.identifier("length")),
                    ])
                ),
            ]),
            t.forStatement(
                t.variableDeclaration("let", [
                    t.variableDeclarator(t.identifier("i"), t.numericLiteral(0)),
                ]),
                t.binaryExpression(
                    "<",
                    t.identifier("i"),
                    t.memberExpression(t.identifier("parts"), t.identifier("length"))
                ),
                t.updateExpression("++", t.identifier("i")),
                t.blockStatement([
                    t.variableDeclaration("const", [
                        t.variableDeclarator(
                            t.identifier("value"),
                            encode
                                ? t.callExpression(t.identifier(stringDecoderName), [
                                      t.memberExpression(
                                          t.identifier("parts"),
                                          t.identifier("i"),
                                          true
                                      ),
                                  ])
                                : t.memberExpression(
                                      t.identifier("parts"),
                                      t.identifier("i"),
                                      true
                                  )
                        ),
                    ]),
                    t.expressionStatement(
                        t.assignmentExpression(
                            "=",
                            t.memberExpression(
                                t.identifier("restored"),
                                t.memberExpression(
                                    t.identifier("order"),
                                    t.identifier("i"),
                                    true
                                ),
                                true
                            ),
                            t.identifier("value")
                        )
                    ),
                ])
            ),
            t.returnStatement(
                t.callExpression(
                    t.memberExpression(t.identifier("restored"), t.identifier("join")),
                    [t.stringLiteral(" ")]
                )
            ),
        ])
    );

    return [stringTableDeclaration, stringOrderDeclaration, stringAccessorFn];
}
