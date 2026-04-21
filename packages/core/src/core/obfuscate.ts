import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import * as babelParser from "@babel/parser";
import * as t from "@babel/types";
import { generate } from "../babel/interop.js";
import { resolveConfig } from "../config/index.js";
import { buildRuntimeHelpers, insertHelperStatements } from "../runtime/index.js";
import { renameBindings } from "../transforms/identifierRenamer.js";
import { obfuscateLiterals } from "../transforms/literalObfuscator.js";
import { renameProperties } from "../transforms/propertyRenamer.js";
import { addUnnecessaryDepth } from "../transforms/unnecessaryDepth.js";
import type { ObfuscationConfigInput } from "../types/config.js";
import type { ObfuscateCodeResult, ObfuscateFileOptions, ObfuscationStats } from "../types/core.js";
import type { RuntimeHelperOptions } from "../types/runtime.js";
import { encodeStringLiteralValue, NameGenerator } from "../utils/random.js";
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
    const outputCode = config.options.minify
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
    const depthResult = config.features.unnecessary_depth
        ? addUnnecessaryDepth(ast, names)
        : { addedReferences: 0 };
    const literalResult = obfuscateLiterals(ast, names, config);

    if (config.features.functionify) {
        functionifyProgram(ast, names, literalResult.runtimeOptions);
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
    runtimeOptions: RuntimeHelperOptions
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
    const functionParamNames = [
        ...collectTopLevelBindingNames(imports),
        ...collectRuntimeBindingNames(runtimeOptions),
    ];
    const bodyStringRef = addFunctionifiedBodyString(runtimeOptions, names, bodyCode);
    const bodyStringExpression = t.callExpression(t.identifier(bodyStringRef.decoderName), [
        t.callExpression(t.identifier(bodyStringRef.accessorName), [
            t.numericLiteral(bodyStringRef.tableIndex),
        ]),
    ]);
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
        names.push(
            runtimeOptions.strings.tableName,
            runtimeOptions.strings.accessorName,
            runtimeOptions.strings.decoderName
        );
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
    bodyCode: string
): { accessorName: string; decoderName: string; tableIndex: number } {
    if (runtimeOptions.strings === undefined) {
        runtimeOptions.strings = {
            tableName: names.freshIdentifier(),
            accessorName: names.freshIdentifier(),
            decoderName: names.freshIdentifier(),
            encodedTable: [],
            xorKey: crypto.randomInt(1, 256),
        };
    }

    const tableIndex = runtimeOptions.strings.encodedTable.length;

    runtimeOptions.strings.encodedTable.push(
        chunkEncodedString(encodeStringLiteralValue(bodyCode, runtimeOptions.strings.xorKey))
    );

    return {
        accessorName: runtimeOptions.strings.accessorName,
        decoderName: runtimeOptions.strings.decoderName,
        tableIndex,
    };
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

function chunkEncodedString(input: string): string[] {
    if (input.length === 0) {
        return [""];
    }

    const chunks: string[] = [];

    for (let i = 0; i < input.length; i += 3) {
        chunks.push(input.slice(i, i + 3));
    }

    return chunks;
}
