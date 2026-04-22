import * as t from "@babel/types";
import type { StringObfuscationMethod } from "@skylvi/veyl-config";
import { generate } from "../../babel/interop.js";
import type { RuntimeHelperOptions } from "../../types/runtime.js";
import type { NameGenerator } from "../../utils/random.js";
import { addWrappedBodyString } from "./bodyString.js";
import { buildEncryptedPayload, hasEncryptedPayload } from "./encryption.js";

interface ExecutionWrapperConfig {
    features: {
        evalify: boolean;
        functionify: boolean;
        node_vm: boolean;
        encryption: {
            public_key: string | null;
            private_key: string | null;
        };
    };
    obfuscate: {
        strings: {
            method: StringObfuscationMethod;
            split_length: number;
            encode: boolean;
            unicode_escape_sequence: boolean;
        };
    };
}

export type ExecutionWrapperMode = "functionify" | "evalify" | "node_vm";

export function resolveExecutionWrapperMode(features: {
    functionify: boolean;
    evalify: boolean;
    node_vm: boolean;
}): ExecutionWrapperMode | null {
    if (features.functionify) {
        return "functionify";
    }

    if (features.evalify) {
        return "evalify";
    }

    if (features.node_vm) {
        return "node_vm";
    }

    return null;
}

export function wrapProgramWithExecutionMode(
    ast: object,
    names: NameGenerator,
    runtimeOptions: RuntimeHelperOptions,
    config: ExecutionWrapperConfig,
    mode: ExecutionWrapperMode
): number {
    const program = (ast as { program?: { body?: t.Statement[] } }).program;

    if (program?.body === undefined) {
        return 0;
    }

    let importCount = 0;

    while (importCount < program.body.length && t.isImportDeclaration(program.body[importCount])) {
        importCount++;
    }

    const imports = program.body.slice(0, importCount);
    const bodyStatements = program.body.slice(importCount);

    if (bodyStatements.length === 0) {
        return 0;
    }

    if (bodyStatements.some((statement) => t.isExportDeclaration(statement))) {
        throw new Error(`features.${mode} does not support export statements`);
    }

    const bodyCode = generate(t.file(t.program(bodyStatements)), {
        comments: false,
        compact: false,
    }).code;
    const encryptedPayload = hasEncryptedPayload(config)
        ? buildEncryptedPayload(bodyCode, runtimeOptions, names, config)
        : null;
    const bodyStringExpression =
        encryptedPayload?.bodyStringExpression ??
        addWrappedBodyString(runtimeOptions, names, bodyCode, config);
    const importBindingNames = collectTopLevelBindingNames(imports);
    const runtimeBindingNames = collectRuntimeBindingNames(runtimeOptions);
    const importStatements = encryptedPayload?.importStatements ?? [];
    const setupStatements = encryptedPayload?.setupStatements ?? [];
    const wrappedStringCount = encryptedPayload?.wrappedStringCount ?? 1;

    if (mode === "functionify") {
        const functionParamNames = [...importBindingNames, ...runtimeBindingNames];
        program.body = [
            ...imports,
            ...importStatements,
            ...setupStatements,
            t.expressionStatement(
                t.callExpression(
                    t.newExpression(t.identifier("Function"), [
                        ...functionParamNames.map((name) => t.stringLiteral(name)),
                        bodyStringExpression,
                    ]),
                    functionParamNames.map((name) => t.identifier(name))
                )
            ),
        ];

        return wrappedStringCount;
    }

    if (mode === "evalify") {
        program.body = [
            ...imports,
            ...importStatements,
            ...setupStatements,
            t.expressionStatement(t.callExpression(t.identifier("eval"), [bodyStringExpression])),
        ];

        return wrappedStringCount;
    }

    const createContextName = names.freshIdentifier();
    const runInContextName = names.freshIdentifier();
    const contextName = names.freshIdentifier();
    const contextPropertyNames = [
        "console",
        ...new Set([...importBindingNames, ...runtimeBindingNames]),
    ];

    program.body = [
        ...imports,
        ...importStatements,
        t.importDeclaration(
            [
                t.importSpecifier(t.identifier(createContextName), t.identifier("createContext")),
                t.importSpecifier(t.identifier(runInContextName), t.identifier("runInContext")),
            ],
            t.stringLiteral("node:vm")
        ),
        t.variableDeclaration("const", [
            t.variableDeclarator(
                t.identifier(contextName),
                t.callExpression(t.identifier(createContextName), [
                    t.objectExpression(
                        contextPropertyNames.map((name) =>
                            t.objectProperty(t.identifier(name), t.identifier(name), false, true)
                        )
                    ),
                ])
            ),
        ]),
        ...setupStatements,
        t.expressionStatement(
            t.callExpression(t.identifier(runInContextName), [
                bodyStringExpression,
                t.identifier(contextName),
            ])
        ),
    ];

    return wrappedStringCount;
}

function collectTopLevelBindingNames(statements: t.Statement[]): string[] {
    const names: string[] = [];

    for (const statement of statements) {
        if (t.isImportDeclaration(statement)) {
            for (const specifier of statement.specifiers) {
                names.push(specifier.local.name);
            }

            continue;
        }

        if (t.isFunctionDeclaration(statement) && statement.id && t.isIdentifier(statement.id)) {
            names.push(statement.id.name);
            continue;
        }

        if (t.isClassDeclaration(statement) && statement.id && t.isIdentifier(statement.id)) {
            names.push(statement.id.name);
            continue;
        }

        if (t.isVariableDeclaration(statement)) {
            for (const declaration of statement.declarations) {
                collectPatternBindingNames(declaration.id, names);
            }
        }
    }

    return [...new Set(names)];
}

function collectRuntimeBindingNames(runtimeOptions: RuntimeHelperOptions): string[] {
    const names: string[] = [];

    if (runtimeOptions.strings !== undefined) {
        if (runtimeOptions.strings.encode) {
            names.push(runtimeOptions.strings.decoderName);
        }

        if (runtimeOptions.strings.tableName !== undefined) {
            names.push(runtimeOptions.strings.tableName);
        }

        if (runtimeOptions.strings.accessorName !== undefined) {
            names.push(runtimeOptions.strings.accessorName);
        }
    }

    if (runtimeOptions.numbers !== undefined) {
        names.push(runtimeOptions.numbers.decoderName);
    }

    if (runtimeOptions.booleans !== undefined) {
        names.push(runtimeOptions.booleans.decoderName);
    }

    return names;
}

function collectPatternBindingNames(pattern: t.Node, names: string[]): void {
    if (t.isIdentifier(pattern)) {
        names.push(pattern.name);
        return;
    }

    if (t.isObjectPattern(pattern)) {
        for (const property of pattern.properties) {
            if (t.isObjectProperty(property)) {
                collectPatternBindingNames(property.value, names);
            }

            if (t.isRestElement(property)) {
                collectPatternBindingNames(property.argument, names);
            }
        }

        return;
    }

    if (t.isArrayPattern(pattern)) {
        for (const element of pattern.elements) {
            if (element !== null) {
                collectPatternBindingNames(element, names);
            }
        }

        return;
    }

    if (t.isAssignmentPattern(pattern)) {
        collectPatternBindingNames(pattern.left, names);
        return;
    }

    if (t.isRestElement(pattern)) {
        collectPatternBindingNames(pattern.argument, names);
    }
}
