import fs from "node:fs";
import path from "node:path";
import * as babelParser from "@babel/parser";
import type { ObfuscationConfigInput } from "@skylvi/veyl-config";
import { resolveConfig } from "@skylvi/veyl-config";
import { generate } from "../babel/interop.js";
import { buildRuntimeHelpers, insertHelperStatements } from "../runtime/index.js";
import { flattenControlFlow } from "../transforms/controlFlowFlattening.js";
import { injectDeadCode } from "../transforms/deadCodeInjector.js";
import {
    resolveExecutionWrapperMode,
    wrapProgramWithExecutionMode,
} from "../transforms/execution/wrapper.js";
import { renameBindings } from "../transforms/identifierRenamer.js";
import { obfuscateLiterals } from "../transforms/literalObfuscator.js";
import { renameProperties } from "../transforms/propertyRenamer.js";
import { simplifyStatements } from "../transforms/simplifier.js";
import { addUnnecessaryDepth } from "../transforms/unnecessaryDepth.js";
import type {
    ObfuscateCodeResult,
    ObfuscateEntryResult,
    ObfuscateFileOptions,
    ObfuscationStats,
} from "../types/core.js";
import { NameGenerator } from "../utils/random.js";
import { bundleInput, compactOutput } from "./bundler.js";

/**
 * Bundles a TypeScript or JavaScript entry file, obfuscates the bundled output,
 * writes the result to disk, and returns run statistics.
 *
 * This is the primary file-based API for using Veyl from another Node project.
 */
export async function obfuscateFile(opts: ObfuscateFileOptions): Promise<ObfuscationStats> {
    const result = await obfuscateEntry(opts);

    if (opts.output === null || opts.output === undefined) {
        throw new Error("obfuscateFile requires an output path");
    }

    return result.stats;
}

/**
 * Bundles a TypeScript or JavaScript entry file, obfuscates the bundled output,
 * and returns both the emitted code and run statistics.
 *
 * When `opts.output` is provided the code is also written to disk; otherwise the
 * caller can decide how to consume the emitted source.
 */
export async function obfuscateEntry(opts: ObfuscateFileOptions): Promise<ObfuscateEntryResult> {
    const startedAt = performance.now();
    const input = path.resolve(opts.input);
    const output =
        opts.output === null || opts.output === undefined ? "<stdout>" : path.resolve(opts.output);
    const config = resolveConfig(opts.config);

    const bundle = await bundleInput(input);
    const transformed = obfuscateCode(bundle.code, config);
    const outputCode = config.minify
        ? await compactOutput(transformed.code, !config.features.randomized_unique_identifiers)
        : transformed.code;

    if (opts.output !== null && opts.output !== undefined) {
        fs.mkdirSync(path.dirname(output), { recursive: true });
        fs.writeFileSync(output, outputCode, "utf-8");
    }

    return {
        code: outputCode,
        stats: {
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
        },
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
    const executionWrapperMode = resolveExecutionWrapperMode(config.features);

    if (executionWrapperMode !== null) {
        literalResult.stringCount += wrapProgramWithExecutionMode(
            ast,
            names,
            literalResult.runtimeOptions,
            config,
            executionWrapperMode
        );
    }

    const helperNodes = buildRuntimeHelpers(literalResult.runtimeOptions);
    insertHelperStatements(ast, helperNodes);
    const helperBindingPass =
        config.features.randomized_unique_identifiers && executionWrapperMode === null
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
