import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import * as babelParser from "@babel/parser";
import * as t from "@babel/types";
import type { ObfuscationConfigInput, StringObfuscationMethod } from "@skylvi/veyl-config";
import { resolveConfig } from "@skylvi/veyl-config";
import { generate } from "../babel/interop.js";
import { buildRuntimeHelpers, insertHelperStatements } from "../runtime/index.js";
import { flattenControlFlow } from "../transforms/controlFlowFlattening.js";
import { injectDeadCode } from "../transforms/deadCodeInjector.js";
import { renameBindings } from "../transforms/identifierRenamer.js";
import { obfuscateLiterals } from "../transforms/literalObfuscator.js";
import { renameProperties } from "../transforms/propertyRenamer.js";
import { simplifyStatements } from "../transforms/simplifier.js";
import { addUnnecessaryDepth } from "../transforms/unnecessaryDepth.js";
import type { ObfuscateCodeResult, ObfuscateFileOptions, ObfuscationStats } from "../types/core.js";
import type { RuntimeHelperOptions } from "../types/runtime.js";
import { encodeStringLiteralValue, NameGenerator } from "../utils/random.js";
import { createStringLiteralNode } from "../utils/stringLiteral.js";
import { bundleInput, compactOutput } from "./bundler.js";

/**
 * Bundles a TypeScript or JavaScript entry file, obfuscates the bundled output,
 * writes the result to disk, and returns run statistics.
 *
 * This is the primary file-based API for using Veyl from another Node project.
 */
export async function obfuscateFile(opts: ObfuscateFileOptions): Promise<ObfuscationStats> {
    const startedAt = performance.now();
    const input = path.resolve(opts.input);
    const output = path.resolve(opts.output);
    const config = resolveConfig(opts.config);

    const bundle = await bundleInput(input);
    const transformed = obfuscateCode(bundle.code, config);
    const outputCode = config.minify
        ? await compactOutput(transformed.code, !config.features.randomized_unique_identifiers)
        : transformed.code;

    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, outputCode, "utf-8");

    return {
        input,
        output,
        bundledBytes: bundle.bytes,
        outputBytes: outputCode.length,
        renamedBindings: transformed.renamedBindings,
        renamedProperties: transformed.renamedProperties,
        addedDepthReferences: transformed.addedDepthReferences,
        addedDeadCodeBlocks: transformed.addedDeadCodeBlocks,
        flattenedControlFlowBlocks: transformed.flattenedControlFlowBlocks,
        simplifiedStatements: transformed.simplifiedStatements,
        obfuscatedStrings: transformed.obfuscatedStrings,
        obfuscatedNumbers: transformed.obfuscatedNumbers,
        obfuscatedBooleans: transformed.obfuscatedBooleans,
        booleanObfuscationNumber: transformed.booleanObfuscationNumber,
        numberObfuscationOffset: transformed.numberObfuscationOffset,
        numberObfuscationOperators: transformed.numberObfuscationOperators,
        elapsedMs: performance.now() - startedAt,
    };
}

/**
 * Obfuscates an already-bundled JavaScript source string and returns the
 * transformed code plus transformation statistics.
 *
 * Use `obfuscateFile` instead when Veyl should handle esbuild bundling and
 * writing the output file for you.
 */
export function obfuscateCode(
    input: string,
    configInput?: ObfuscationConfigInput
): ObfuscateCodeResult {
    const config = resolveConfig(configInput);
    const ast = babelParser.parse(input, {
        sourceType: "module",
        strictMode: false,
        allowReturnOutsideFunction: true,
    });

    const names = new NameGenerator();

    const firstBindingPass = config.features.randomized_unique_identifiers
        ? renameBindings(ast, names)
        : 0;
    const propertyResult = config.features.randomized_unique_identifiers
        ? renameProperties(ast, names)
        : { renamedProperties: 0 };
    const simplifyResult = config.features.simplify
        ? simplifyStatements(ast)
        : { simplifiedStatements: 0 };
    const depthResult = config.features.unnecessary_depth
        ? addUnnecessaryDepth(ast, names)
        : { addedReferences: 0 };
    const deadCodeResult = config.features.dead_code_injection
        ? injectDeadCode(ast, names)
        : { addedBlocks: 0 };
    const controlFlowResult = config.features.control_flow_flattening
        ? flattenControlFlow(ast, names)
        : { flattenedBlocks: 0 };
    const literalResult = obfuscateLiterals(ast, names, config);

    if (config.features.functionify) {
        functionifyProgram(ast, names, literalResult.runtimeOptions, config);
        literalResult.stringCount++;
    }

    const helperNodes = buildRuntimeHelpers(literalResult.runtimeOptions);
    insertHelperStatements(ast, helperNodes);
    const helperBindingPass = config.features.randomized_unique_identifiers
        ? renameBindings(ast, names)
        : 0;

    const { code } = generate(ast, {
        comments: false,
        compact: false,
    });

    return {
        code,
        renamedBindings: firstBindingPass + helperBindingPass,
        renamedProperties: propertyResult.renamedProperties,
        addedDepthReferences: depthResult.addedReferences,
        addedDeadCodeBlocks: deadCodeResult.addedBlocks,
        flattenedControlFlowBlocks: controlFlowResult.flattenedBlocks,
        simplifiedStatements: simplifyResult.simplifiedStatements,
        obfuscatedStrings: literalResult.stringCount,
        obfuscatedNumbers: literalResult.numberCount,
        obfuscatedBooleans: literalResult.booleanCount,
        booleanObfuscationNumber: literalResult.booleanNumber,
        numberObfuscationOffset: literalResult.numberOffset,
        numberObfuscationOperators: literalResult.numberOperators,
    };
}

function functionifyProgram(
    ast: object,
    names: NameGenerator,
    runtimeOptions: RuntimeHelperOptions,
    config: {
        obfuscate: {
            strings: {
                method: StringObfuscationMethod;
                split_length: number;
                encode: boolean;
                unicode_escape_sequence: boolean;
            };
        };
    }
): void {
    const program = (ast as { program?: { body?: t.Statement[] } }).program;

    if (program?.body === undefined) {
        return;
    }

    let importCount = 0;

    while (importCount < program.body.length && t.isImportDeclaration(program.body[importCount])) {
        importCount++;
    }

    const imports = program.body.slice(0, importCount);
    const bodyStatements = program.body.slice(importCount);

    if (bodyStatements.length === 0) {
        return;
    }

    if (bodyStatements.some((statement) => t.isExportDeclaration(statement))) {
        throw new Error("features.functionify does not support export statements");
    }

    const bodyCode = generate(t.file(t.program(bodyStatements)), {
        comments: false,
        compact: false,
    }).code;
    const bodyStringExpression = addFunctionifiedBodyString(
        runtimeOptions,
        names,
        bodyCode,
        config
    );
    const functionParamNames = [
        ...collectTopLevelBindingNames(imports),
        ...collectRuntimeBindingNames(runtimeOptions),
    ];
    const functionCall = t.expressionStatement(
        t.callExpression(
            t.newExpression(t.identifier("Function"), [
                ...functionParamNames.map((name) => t.stringLiteral(name)),
                bodyStringExpression,
            ]),
            functionParamNames.map((name) => t.identifier(name))
        )
    );

    program.body = [...imports, functionCall];
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

function addFunctionifiedBodyString(
    runtimeOptions: RuntimeHelperOptions,
    names: NameGenerator,
    bodyCode: string,
    config: {
        obfuscate: {
            strings: {
                method: StringObfuscationMethod;
                split_length: number;
                encode: boolean;
                unicode_escape_sequence: boolean;
            };
        };
    }
): t.Expression {
    if (runtimeOptions.strings === undefined) {
        runtimeOptions.strings = {
            method: config.obfuscate.strings.method,
            decoderName: names.freshIdentifier(),
            encode: config.obfuscate.strings.encode,
            unicodeEscapeSequence: config.obfuscate.strings.unicode_escape_sequence,
            xorKey: crypto.randomInt(1, 256),
        };

        if (config.obfuscate.strings.method === "array") {
            runtimeOptions.strings.tableName = names.freshIdentifier();
            runtimeOptions.strings.accessorName = names.freshIdentifier();
            runtimeOptions.strings.encodedTable = [];
            runtimeOptions.strings.orderTable = [];
        }
    }

    if (runtimeOptions.strings.method === "split") {
        return buildSplitStringExpression(
            runtimeOptions.strings.decoderName,
            bodyCode,
            runtimeOptions.strings.xorKey,
            config.obfuscate.strings.split_length,
            runtimeOptions.strings.encode,
            runtimeOptions.strings.unicodeEscapeSequence
        );
    }

    const stringRuntime = runtimeOptions.strings;
    const encodedTable = stringRuntime.encodedTable;
    const orderTable = stringRuntime.orderTable;
    const accessorName = stringRuntime.accessorName;

    if (accessorName === undefined || encodedTable === undefined || orderTable === undefined) {
        throw new Error("array string obfuscation requires string table state");
    }

    const tableIndex = encodedTable.length;
    const shuffledParts = shuffleStringParts(splitStringForArrayTable(bodyCode));

    encodedTable.push(
        shuffledParts.parts.map((part) =>
            stringRuntime.encode ? encodeStringLiteralValue(part, stringRuntime.xorKey) : part
        )
    );
    orderTable.push(shuffledParts.order);

    const accessorCall = t.callExpression(t.identifier(accessorName), [
        t.numericLiteral(tableIndex),
    ]);
    return accessorCall;
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

function buildSplitStringExpression(
    stringDecoderName: string,
    literalValue: string,
    stringXorKey: number,
    stringSplitLength: number,
    encode: boolean,
    unicodeEscapeSequence: boolean
): t.Expression {
    const parts = splitPlainString(literalValue, stringSplitLength).map((chunk) =>
        encode
            ? t.callExpression(t.identifier(stringDecoderName), [
                  createStringLiteralNode(
                      encodeStringLiteralValue(chunk, stringXorKey),
                      unicodeEscapeSequence
                  ),
              ])
            : createStringLiteralNode(chunk, unicodeEscapeSequence)
    );

    let output: t.Expression = parts[0] ?? createStringLiteralNode("", unicodeEscapeSequence);

    for (let i = 1; i < parts.length; i++) {
        output = t.binaryExpression("+", output, parts[i]);
    }

    return output;
}

function splitPlainString(input: string, splitLength: number): string[] {
    if (input.length === 0) {
        return [""];
    }

    const chunks: string[] = [];

    for (let i = 0; i < input.length; i += splitLength) {
        chunks.push(input.slice(i, i + splitLength));
    }

    return chunks;
}

function splitStringForArrayTable(input: string): string[] {
    return input.split(" ");
}

function shuffleStringParts(parts: string[]): { parts: string[]; order: number[] } {
    const shuffled = parts.map((value, index) => ({ value, index }));

    for (let i = shuffled.length - 1; i > 0; i--) {
        const pickAt = crypto.randomInt(0, i + 1);
        const current = shuffled[i];
        shuffled[i] = shuffled[pickAt] as { value: string; index: number };
        shuffled[pickAt] = current as { value: string; index: number };
    }

    return {
        parts: shuffled.map((entry) => entry.value),
        order: shuffled.map((entry) => entry.index),
    };
}
