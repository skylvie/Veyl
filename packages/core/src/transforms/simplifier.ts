import * as t from "@babel/types";
import type { SimplifyResult } from "../types/transforms.js";

// Applies compacting rewrites that preserve behavior while reducing statement structure
export function simplifyStatements(ast: object): SimplifyResult {
    const program = (ast as { program?: t.Program }).program;

    if (program === undefined) {
        return { simplifiedStatements: 0 };
    }

    return {
        simplifiedStatements: simplifyStatementList(program.body, false),
    };
}

function simplifyStatementList(statements: t.Statement[], inFunction: boolean): number {
    let simplifiedStatements = 0;

    for (let index = 0; index < statements.length; index++) {
        const current = statements[index];

        if (current === undefined) {
            continue;
        }

        const nested = simplifyStandaloneStatement(current, inFunction);
        simplifiedStatements += nested.simplifiedStatements;
        statements[index] = nested.statement;
    }

    simplifiedStatements += mergeAdjacentVariableDeclarations(statements);
    simplifiedStatements += mergeAdjacentExpressionStatements(statements);

    if (inFunction) {
        simplifiedStatements += foldReturnExpressionTails(statements);
        simplifiedStatements += simplifyReturningIfStatements(statements);
    }

    return simplifiedStatements;
}

function simplifyStandaloneStatement(
    statement: t.Statement,
    inFunction: boolean
): { statement: t.Statement; simplifiedStatements: number } {
    if (t.isBlockStatement(statement)) {
        return {
            statement,
            simplifiedStatements: simplifyStatementList(statement.body, inFunction),
        };
    }

    if (t.isIfStatement(statement)) {
        let simplifiedStatements = 0;

        const consequent = simplifyStandaloneStatement(statement.consequent, inFunction);
        statement.consequent = consequent.statement;
        simplifiedStatements += consequent.simplifiedStatements;

        if (statement.alternate != null) {
            const alternate = simplifyStandaloneStatement(statement.alternate, inFunction);
            statement.alternate = alternate.statement;
            simplifiedStatements += alternate.simplifiedStatements;
        }

        const consequentExpression = statementToReturnExpression(statement.consequent);
        const alternateExpression =
            statement.alternate == null ? null : statementToReturnExpression(statement.alternate);

        if (consequentExpression !== null && alternateExpression !== null) {
            return {
                statement: t.returnStatement(
                    t.conditionalExpression(
                        t.cloneNode(statement.test),
                        consequentExpression,
                        alternateExpression
                    )
                ),
                simplifiedStatements: simplifiedStatements + 1,
            };
        }

        return {
            statement,
            simplifiedStatements,
        };
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
        const nested = simplifyStandaloneStatement(statement.body, inFunction);
        statement.body = nested.statement;

        return {
            statement,
            simplifiedStatements: nested.simplifiedStatements,
        };
    }

    if (t.isTryStatement(statement)) {
        let simplifiedStatements = simplifyStatementList(statement.block.body, inFunction);

        if (statement.handler != null) {
            simplifiedStatements += simplifyStatementList(statement.handler.body.body, inFunction);
        }

        if (statement.finalizer != null) {
            simplifiedStatements += simplifyStatementList(statement.finalizer.body, inFunction);
        }

        return {
            statement,
            simplifiedStatements,
        };
    }

    if (t.isSwitchStatement(statement)) {
        let simplifiedStatements = 0;

        for (const switchCase of statement.cases) {
            simplifiedStatements += simplifyStatementList(switchCase.consequent, inFunction);
        }

        return {
            statement,
            simplifiedStatements,
        };
    }

    if (
        t.isFunctionDeclaration(statement) ||
        t.isFunctionExpression(statement) ||
        t.isArrowFunctionExpression(statement)
    ) {
        if (!t.isBlockStatement(statement.body)) {
            return { statement, simplifiedStatements: 0 };
        }

        return {
            statement,
            simplifiedStatements: simplifyStatementList(statement.body.body, true),
        };
    }

    if (t.isClassDeclaration(statement) || t.isClassExpression(statement)) {
        let simplifiedStatements = 0;

        for (const member of statement.body.body) {
            if (
                (t.isClassMethod(member) || t.isClassPrivateMethod(member)) &&
                t.isBlockStatement(member.body)
            ) {
                simplifiedStatements += simplifyStatementList(member.body.body, true);
            }
        }

        return {
            statement,
            simplifiedStatements,
        };
    }

    return {
        statement,
        simplifiedStatements: 0,
    };
}

function mergeAdjacentVariableDeclarations(statements: t.Statement[]): number {
    let rewrites = 0;
    let index = 0;

    while (index < statements.length - 1) {
        const current = statements[index];
        const next = statements[index + 1];

        if (
            current === undefined ||
            next === undefined ||
            !t.isVariableDeclaration(current) ||
            !t.isVariableDeclaration(next) ||
            current.kind !== next.kind
        ) {
            index++;
            continue;
        }

        current.declarations.push(
            ...next.declarations.map((declaration) => t.cloneNode(declaration))
        );
        statements.splice(index + 1, 1);
        rewrites++;
    }

    return rewrites;
}

function mergeAdjacentExpressionStatements(statements: t.Statement[]): number {
    let rewrites = 0;
    let index = 0;

    while (index < statements.length - 1) {
        const current = statements[index];
        const next = statements[index + 1];

        if (
            current === undefined ||
            next === undefined ||
            !t.isExpressionStatement(current) ||
            !t.isExpressionStatement(next)
        ) {
            index++;
            continue;
        }

        current.expression = appendSequenceExpression(current.expression, next.expression);
        statements.splice(index + 1, 1);
        rewrites++;
    }

    return rewrites;
}

function foldReturnExpressionTails(statements: t.Statement[]): number {
    let rewrites = 0;

    for (let index = 0; index < statements.length; index++) {
        const statement = statements[index];

        if (!t.isReturnStatement(statement)) {
            continue;
        }

        let start = index;

        while (start > 0) {
            const previous = statements[start - 1];

            if (previous === undefined || !t.isExpressionStatement(previous)) {
                break;
            }

            start--;
        }

        if (start === index) {
            continue;
        }

        const expressions = statements
            .slice(start, index)
            .filter(t.isExpressionStatement)
            .map((entry) => cloneExpression(entry.expression));
        const returnExpression = getReturnExpression(statement);

        statements.splice(
            start,
            index - start + 1,
            t.returnStatement(buildSequenceExpression([...expressions, returnExpression]))
        );
        rewrites++;
        index = start;
    }

    return rewrites;
}

function simplifyReturningIfStatements(statements: t.Statement[]): number {
    let rewrites = 0;

    for (let index = 0; index < statements.length; index++) {
        const statement = statements[index];

        if (!t.isIfStatement(statement) || statement.alternate == null) {
            continue;
        }

        const consequentExpression = statementToReturnExpression(statement.consequent);
        const alternateExpression = statementToReturnExpression(statement.alternate);

        if (consequentExpression === null || alternateExpression === null) {
            continue;
        }

        statements[index] = t.returnStatement(
            t.conditionalExpression(
                t.cloneNode(statement.test),
                consequentExpression,
                alternateExpression
            )
        );
        rewrites++;
    }

    return rewrites;
}

function statementToReturnExpression(statement: t.Statement): t.Expression | null {
    if (t.isReturnStatement(statement)) {
        return getReturnExpression(statement);
    }

    if (t.isBlockStatement(statement)) {
        if (statement.body.length === 0) {
            return null;
        }

        const expressions: t.Expression[] = [];

        for (let index = 0; index < statement.body.length; index++) {
            const entry = statement.body[index];

            if (entry === undefined) {
                return null;
            }

            if (t.isExpressionStatement(entry)) {
                expressions.push(cloneExpression(entry.expression));
                continue;
            }

            if (t.isReturnStatement(entry) && index === statement.body.length - 1) {
                expressions.push(getReturnExpression(entry));
                return buildSequenceExpression(expressions);
            }

            return null;
        }
    }

    if (t.isIfStatement(statement) && statement.alternate != null) {
        const consequentExpression = statementToReturnExpression(statement.consequent);
        const alternateExpression = statementToReturnExpression(statement.alternate);

        if (consequentExpression === null || alternateExpression === null) {
            return null;
        }

        return t.conditionalExpression(
            t.cloneNode(statement.test),
            consequentExpression,
            alternateExpression
        );
    }

    return null;
}

function appendSequenceExpression(left: t.Expression, right: t.Expression): t.Expression {
    if (t.isSequenceExpression(left)) {
        return t.sequenceExpression([
            ...left.expressions.map((entry) => cloneExpression(entry)),
            cloneExpression(right),
        ]);
    }

    return t.sequenceExpression([cloneExpression(left), cloneExpression(right)]);
}

function buildSequenceExpression(expressions: t.Expression[]): t.Expression {
    if (expressions.length === 0) {
        return t.unaryExpression("void", t.numericLiteral(0));
    }

    if (expressions.length === 1) {
        return expressions[0] as t.Expression;
    }

    return t.sequenceExpression(expressions);
}

function cloneExpression(expression: t.Expression): t.Expression {
    return t.cloneNode(expression);
}

function getReturnExpression(statement: t.ReturnStatement): t.Expression {
    if (statement.argument == null) {
        return t.unaryExpression("void", t.numericLiteral(0));
    }

    return cloneExpression(statement.argument);
}
