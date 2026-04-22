import crypto from "node:crypto";
import * as t from "@babel/types";
import type { ControlFlowFlatteningResult } from "../types/transforms.js";
import type { NameGenerator } from "../utils/random.js";

// Rewrites eligible straight-line statement runs into a dispatcher loop state machine
export function flattenControlFlow(ast: object, names: NameGenerator): ControlFlowFlatteningResult {
    const program = (ast as { program?: t.Program }).program;

    if (program === undefined) {
        return { flattenedBlocks: 0 };
    }

    return {
        flattenedBlocks: flattenStatementList(program.body, names, {
            protectedPrefixLength: countLeadingProtectedStatements(program.body),
            inConstructorBody: false,
        }),
    };
}

function flattenStatementList(
    statements: t.Statement[],
    names: NameGenerator,
    options: { protectedPrefixLength: number; inConstructorBody: boolean }
): number {
    let flattenedBlocks = 0;

    for (const statement of statements) {
        flattenedBlocks += flattenNestedContainers(statement, names);
    }

    let index = options.protectedPrefixLength;

    while (index < statements.length) {
        const statement = statements[index];

        if (
            statement === undefined ||
            !isFlattenableStatement(statement, options.inConstructorBody)
        ) {
            index++;
            continue;
        }

        let end = index + 1;

        while (
            end < statements.length &&
            isFlattenableStatement(statements[end] as t.Statement, options.inConstructorBody)
        ) {
            end++;
        }

        if (end - index >= 3) {
            const replacement = buildFlattenedStatements(statements.slice(index, end), names);

            if (replacement === null) {
                index = end;
                continue;
            }

            statements.splice(index, end - index, ...replacement);
            flattenedBlocks++;
            index += replacement.length;
            continue;
        }

        index = end;
    }

    return flattenedBlocks;
}

function flattenNestedContainers(statement: t.Statement, names: NameGenerator): number {
    if (t.isBlockStatement(statement)) {
        return flattenStatementList(statement.body, names, {
            protectedPrefixLength: countLeadingDirectiveStatements(statement.body),
            inConstructorBody: false,
        });
    }

    if (t.isFunctionDeclaration(statement) || t.isFunctionExpression(statement)) {
        if (!t.isBlockStatement(statement.body)) {
            return 0;
        }

        return flattenStatementList(statement.body.body, names, {
            protectedPrefixLength: countLeadingDirectiveStatements(statement.body.body),
            inConstructorBody: false,
        });
    }

    if (t.isClassDeclaration(statement)) {
        return flattenClassBody(statement, names);
    }

    if (t.isIfStatement(statement)) {
        let flattenedBlocks = flattenWrappedStatement(statement.consequent, names);

        if (statement.alternate != null) {
            flattenedBlocks += flattenWrappedStatement(statement.alternate, names);
        }

        return flattenedBlocks;
    }

    if (
        t.isForStatement(statement) ||
        t.isForInStatement(statement) ||
        t.isForOfStatement(statement) ||
        t.isWhileStatement(statement) ||
        t.isDoWhileStatement(statement) ||
        t.isLabeledStatement(statement) ||
        t.isWithStatement(statement)
    ) {
        return flattenWrappedStatement(statement.body, names);
    }

    if (t.isTryStatement(statement)) {
        let flattenedBlocks = flattenStatementList(statement.block.body, names, {
            protectedPrefixLength: countLeadingDirectiveStatements(statement.block.body),
            inConstructorBody: false,
        });

        if (statement.handler != null) {
            flattenedBlocks += flattenStatementList(statement.handler.body.body, names, {
                protectedPrefixLength: countLeadingDirectiveStatements(statement.handler.body.body),
                inConstructorBody: false,
            });
        }

        if (statement.finalizer != null) {
            flattenedBlocks += flattenStatementList(statement.finalizer.body, names, {
                protectedPrefixLength: countLeadingDirectiveStatements(statement.finalizer.body),
                inConstructorBody: false,
            });
        }

        return flattenedBlocks;
    }

    if (t.isSwitchStatement(statement)) {
        let flattenedBlocks = 0;

        for (const switchCase of statement.cases) {
            flattenedBlocks += flattenStatementList(switchCase.consequent, names, {
                protectedPrefixLength: countLeadingDirectiveStatements(switchCase.consequent),
                inConstructorBody: false,
            });
        }

        return flattenedBlocks;
    }

    return 0;
}

function flattenWrappedStatement(statement: t.Statement, names: NameGenerator): number {
    if (!t.isBlockStatement(statement)) {
        return 0;
    }

    return flattenStatementList(statement.body, names, {
        protectedPrefixLength: countLeadingDirectiveStatements(statement.body),
        inConstructorBody: false,
    });
}

function flattenClassBody(
    declaration: t.ClassDeclaration | t.ClassExpression,
    names: NameGenerator
): number {
    let flattenedBlocks = 0;

    for (const member of declaration.body.body) {
        if (
            (t.isClassMethod(member) || t.isClassPrivateMethod(member)) &&
            t.isBlockStatement(member.body)
        ) {
            flattenedBlocks += flattenStatementList(member.body.body, names, {
                protectedPrefixLength: countLeadingDirectiveStatements(member.body.body),
                inConstructorBody: member.kind === "constructor",
            });
        }
    }

    return flattenedBlocks;
}

function buildFlattenedStatements(
    segment: t.Statement[],
    names: NameGenerator
): t.Statement[] | null {
    const preparedSegment = prepareFlattenedSegment(segment);

    if (preparedSegment === null) {
        return null;
    }

    const stateName = names.freshIdentifier();
    const doneName = names.freshIdentifier();
    const exitState = randomStateValue();
    const stateValues = preparedSegment.statements.map(() => randomStateValue());
    const shuffledIndexes = Array.from(
        { length: preparedSegment.statements.length },
        (_, index) => index
    );

    shuffleInPlace(shuffledIndexes);

    return [
        ...preparedSegment.hoistedDeclarations,
        t.variableDeclaration("let", [
            t.variableDeclarator(
                t.identifier(stateName),
                t.numericLiteral(stateValues[0] as number)
            ),
            t.variableDeclarator(t.identifier(doneName), t.booleanLiteral(false)),
        ]),
        t.whileStatement(
            t.unaryExpression("!", t.identifier(doneName)),
            t.blockStatement([
                t.switchStatement(t.identifier(stateName), [
                    ...shuffledIndexes.map((index) =>
                        t.switchCase(t.numericLiteral(stateValues[index] as number), [
                            t.blockStatement([
                                preparedSegment.statements[index] as t.Statement,
                                t.expressionStatement(
                                    t.assignmentExpression(
                                        "=",
                                        t.identifier(stateName),
                                        t.numericLiteral(stateValues[index + 1] ?? exitState)
                                    )
                                ),
                            ]),
                            t.breakStatement(),
                        ])
                    ),
                    t.switchCase(t.numericLiteral(exitState), [
                        t.expressionStatement(
                            t.assignmentExpression(
                                "=",
                                t.identifier(doneName),
                                t.booleanLiteral(true)
                            )
                        ),
                        t.breakStatement(),
                    ]),
                    t.switchCase(null, [
                        t.expressionStatement(
                            t.assignmentExpression(
                                "=",
                                t.identifier(doneName),
                                t.booleanLiteral(true)
                            )
                        ),
                    ]),
                ]),
            ])
        ),
    ];
}

function countLeadingProtectedStatements(statements: t.Statement[]): number {
    let count = 0;

    while (count < statements.length) {
        const statement = statements[count];

        if (statement === undefined) {
            break;
        }

        if (t.isImportDeclaration(statement) || isDirectiveStatement(statement)) {
            count++;
            continue;
        }

        break;
    }

    return count;
}

function countLeadingDirectiveStatements(statements: t.Statement[]): number {
    let count = 0;

    while (count < statements.length) {
        const statement = statements[count];

        if (statement === undefined || !isDirectiveStatement(statement)) {
            break;
        }

        count++;
    }

    return count;
}

function isDirectiveStatement(statement: t.Statement): boolean {
    return t.isExpressionStatement(statement) && t.isStringLiteral(statement.expression);
}

function isFlattenableStatement(statement: t.Statement, inConstructorBody: boolean): boolean {
    if (
        t.isImportDeclaration(statement) ||
        t.isExportDeclaration(statement) ||
        t.isFunctionDeclaration(statement) ||
        t.isClassDeclaration(statement) ||
        t.isEmptyStatement(statement) ||
        t.isBreakStatement(statement) ||
        t.isContinueStatement(statement)
    ) {
        return false;
    }

    if (isDirectiveStatement(statement)) {
        return false;
    }

    if (
        inConstructorBody &&
        t.isExpressionStatement(statement) &&
        t.isCallExpression(statement.expression) &&
        t.isSuper(statement.expression.callee)
    ) {
        return false;
    }

    return true;
}

function prepareFlattenedSegment(
    segment: t.Statement[]
): { hoistedDeclarations: t.Statement[]; statements: t.Statement[] } | null {
    const hoistedDeclarations: t.Statement[] = [];
    const statements: t.Statement[] = [];

    for (const statement of segment) {
        if (!t.isVariableDeclaration(statement)) {
            statements.push(statement);
            continue;
        }

        const preparedDeclaration = prepareVariableDeclaration(statement);

        if (preparedDeclaration === null) {
            return null;
        }

        hoistedDeclarations.push(...preparedDeclaration.hoistedDeclarations);
        statements.push(...preparedDeclaration.runtimeStatements);
    }

    return {
        hoistedDeclarations,
        statements,
    };
}

function prepareVariableDeclaration(
    statement: t.VariableDeclaration
): { hoistedDeclarations: t.Statement[]; runtimeStatements: t.Statement[] } | null {
    if (statement.kind === "const") {
        return null;
    }

    const declaredNames: string[] = [];

    for (const declarator of statement.declarations) {
        if (!t.isIdentifier(declarator.id)) {
            return null;
        }

        declaredNames.push(declarator.id.name);
    }

    const hoistedDeclarations = [
        t.variableDeclaration(
            statement.kind,
            statement.declarations.map((declarator) =>
                t.variableDeclarator(t.cloneNode(declarator.id), null)
            )
        ),
    ];
    const runtimeStatements: t.Statement[] = [];

    for (const declarator of statement.declarations) {
        if (!t.isIdentifier(declarator.id)) {
            return null;
        }

        if (
            declarator.init !== null &&
            nodeContainsIdentifierName(declarator.init, new Set(declaredNames))
        ) {
            return null;
        }

        if (declarator.init === null) {
            continue;
        }

        runtimeStatements.push(
            t.expressionStatement(
                t.assignmentExpression(
                    "=",
                    t.cloneNode(declarator.id as t.Identifier),
                    t.cloneNode(declarator.init as t.Expression)
                )
            )
        );
    }

    return {
        hoistedDeclarations,
        runtimeStatements,
    };
}

function nodeContainsIdentifierName(node: unknown, names: Set<string>): boolean {
    if (node === null || typeof node !== "object") {
        return false;
    }

    if (Array.isArray(node)) {
        return node.some((value) => nodeContainsIdentifierName(value, names));
    }

    const record = node as Record<string, unknown>;

    if (record.type === "Identifier" && typeof record.name === "string") {
        return names.has(record.name);
    }

    for (const value of Object.values(record)) {
        if (nodeContainsIdentifierName(value, names)) {
            return true;
        }
    }

    return false;
}

function randomStateValue(): number {
    return crypto.randomInt(1000, 1_000_000);
}

function shuffleInPlace(values: number[]): void {
    for (let index = values.length - 1; index > 0; index--) {
        const swapIndex = crypto.randomInt(0, index + 1);
        const current = values[index] as number;

        values[index] = values[swapIndex] as number;
        values[swapIndex] = current;
    }
}
