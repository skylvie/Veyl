import crypto from "node:crypto";
import * as t from "@babel/types";
import type { DeadCodeInjectionResult } from "../types/transforms.js";
import type { NameGenerator } from "../utils/random.js";

// Injects unreachable but plausible-looking decoy blocks into statement containers
export function injectDeadCode(ast: object, names: NameGenerator): DeadCodeInjectionResult {
    const program = (ast as { program?: t.Program }).program;

    if (program === undefined) {
        return { addedBlocks: 0 };
    }

    return {
        addedBlocks: injectIntoStatementList(program.body, names, true),
    };
}

function injectIntoStatementList(
    statements: t.Statement[],
    names: NameGenerator,
    isProgramBody = false
): number {
    let addedBlocks = 0;
    let addedBlocksInCurrentList = 0;
    let index = isProgramBody ? countLeadingImports(statements) : 0;
    const originalLength = statements.length;
    let firstEligibleIndex: number | null = null;

    while (index < statements.length) {
        const statement = statements[index];

        if (statement === undefined) {
            break;
        }

        if (index < originalLength && canInjectBefore(statement)) {
            firstEligibleIndex ??= index;
        }

        if (index < originalLength && shouldRandomlyInjectBefore(statement)) {
            statements.splice(index, 0, buildDeadCodeStatement(names));
            addedBlocks++;
            addedBlocksInCurrentList++;
            index++;
        }

        addedBlocks += injectIntoChildContainers(statement, names);
        index++;
    }

    if (addedBlocksInCurrentList === 0 && firstEligibleIndex !== null) {
        statements.splice(firstEligibleIndex, 0, buildDeadCodeStatement(names));
        addedBlocks++;
    }

    return addedBlocks;
}

function injectIntoChildContainers(statement: t.Statement, names: NameGenerator): number {
    if (t.isBlockStatement(statement)) {
        return injectIntoStatementList(statement.body, names);
    }

    if (t.isIfStatement(statement)) {
        let addedBlocks = injectIntoWrappedStatement(statement.consequent, names);

        if (statement.alternate != null) {
            addedBlocks += injectIntoWrappedStatement(statement.alternate, names);
        }

        return addedBlocks;
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
        return injectIntoWrappedStatement(statement.body, names);
    }

    if (t.isTryStatement(statement)) {
        let addedBlocks = injectIntoStatementList(statement.block.body, names);

        if (statement.handler != null) {
            addedBlocks += injectIntoStatementList(statement.handler.body.body, names);
        }

        if (statement.finalizer != null) {
            addedBlocks += injectIntoStatementList(statement.finalizer.body, names);
        }

        return addedBlocks;
    }

    if (t.isSwitchStatement(statement)) {
        let addedBlocks = 0;

        for (const switchCase of statement.cases) {
            addedBlocks += injectIntoStatementList(switchCase.consequent, names);
        }

        return addedBlocks;
    }

    return 0;
}

function injectIntoWrappedStatement(statement: t.Statement, names: NameGenerator): number {
    if (t.isBlockStatement(statement)) {
        return injectIntoStatementList(statement.body, names);
    }

    return 0;
}

function countLeadingImports(statements: t.Statement[]): number {
    let count = 0;

    while (count < statements.length && t.isImportDeclaration(statements[count])) {
        count++;
    }

    return count;
}

function canInjectBefore(statement: t.Statement): boolean {
    if (t.isImportDeclaration(statement) || t.isEmptyStatement(statement)) {
        return false;
    }

    if (t.isExpressionStatement(statement) && t.isStringLiteral(statement.expression)) {
        return false;
    }

    return true;
}

function shouldRandomlyInjectBefore(statement: t.Statement): boolean {
    if (!canInjectBefore(statement)) {
        return false;
    }

    if (t.isFunctionDeclaration(statement) || t.isClassDeclaration(statement)) {
        return crypto.randomInt(0, 100) < 20;
    }

    return crypto.randomInt(0, 100) < 35;
}

function buildDeadCodeStatement(names: NameGenerator): t.Statement {
    const seedName = names.freshIdentifier();
    const valuesName = names.freshIdentifier();
    const indexName = names.freshIdentifier();
    const computeName = names.freshIdentifier();
    const branchKey = crypto.randomInt(5000, 9000);
    const sentinel = branchKey + crypto.randomInt(5, 30);
    const values = Array.from({ length: 3 }, () => crypto.randomInt(10, 500));

    return t.ifStatement(
        t.binaryExpression("!==", t.numericLiteral(branchKey), t.numericLiteral(branchKey)),
        t.blockStatement([
            t.variableDeclaration("let", [
                t.variableDeclarator(t.identifier(seedName), t.numericLiteral(sentinel)),
            ]),
            t.variableDeclaration("const", [
                t.variableDeclarator(
                    t.identifier(valuesName),
                    t.arrayExpression(values.map((value) => t.numericLiteral(value)))
                ),
            ]),
            t.functionDeclaration(
                t.identifier(computeName),
                [t.identifier(indexName)],
                t.blockStatement([
                    t.forStatement(
                        t.variableDeclaration("let", [
                            t.variableDeclarator(t.identifier(indexName), t.numericLiteral(0)),
                        ]),
                        t.binaryExpression(
                            "<",
                            t.identifier(indexName),
                            t.memberExpression(t.identifier(valuesName), t.identifier("length"))
                        ),
                        t.updateExpression("++", t.identifier(indexName)),
                        t.blockStatement([
                            t.expressionStatement(
                                t.assignmentExpression(
                                    "=",
                                    t.identifier(seedName),
                                    t.binaryExpression(
                                        "^",
                                        t.identifier(seedName),
                                        t.memberExpression(
                                            t.identifier(valuesName),
                                            t.identifier(indexName),
                                            true
                                        )
                                    )
                                )
                            ),
                        ])
                    ),
                    t.returnStatement(
                        t.binaryExpression("+", t.identifier(seedName), t.identifier(indexName))
                    ),
                ])
            ),
            t.switchStatement(t.identifier(seedName), [
                t.switchCase(t.numericLiteral(branchKey), [
                    t.expressionStatement(
                        t.assignmentExpression(
                            "=",
                            t.identifier(seedName),
                            t.callExpression(t.identifier(computeName), [t.numericLiteral(1)])
                        )
                    ),
                    t.breakStatement(),
                ]),
                t.switchCase(null, [
                    t.expressionStatement(
                        t.assignmentExpression(
                            "=",
                            t.identifier(seedName),
                            t.callExpression(t.identifier(computeName), [t.numericLiteral(2)])
                        )
                    ),
                ]),
            ]),
        ])
    );
}
