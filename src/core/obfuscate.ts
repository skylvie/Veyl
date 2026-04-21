import fs from "node:fs";
import path from "node:path";
import * as babelParser from "@babel/parser";
import { generate } from "../babel/interop.js";
import { resolveConfig } from "../config/index.js";
import { insertHelperStatements } from "../runtime/index.js";
import { renameBindings } from "../transforms/identifierRenamer.js";
import { obfuscateLiterals } from "../transforms/literalObfuscator.js";
import { renameProperties } from "../transforms/propertyRenamer.js";
import { addUnnecessaryDepth } from "../transforms/unnecessaryDepth.js";
import type { ObfuscationConfigInput } from "../types/config.js";
import type { ObfuscateCodeResult, ObfuscateFileOptions, ObfuscationStats } from "../types/core.js";
import { NameGenerator } from "../utils/random.js";
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

    insertHelperStatements(ast, literalResult.helperNodes);
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
