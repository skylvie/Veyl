import { compactOutput, bundleInput } from "./bundler.js";
import { generate } from "../babel/interop.js";
import { insertHelperStatements } from "../runtime/helpers.js";
import { renameBindings } from "../transforms/identifierRenamer.js";
import { obfuscateLiterals } from "../transforms/literalObfuscator.js";
import { renameProperties } from "../transforms/propertyRenamer.js";
import { addUnnecessaryDepth } from "../transforms/unnecessaryDepth.js";
import { NameGenerator } from "../utils/random.js";
import * as babelParser from "@babel/parser";
import fs from "node:fs";
import path from "node:path";

export interface ObfuscateFileOptions {
    input: string;
    output: string;
}

export interface ObfuscationStats {
    input: string;
    output: string;
    bundledBytes: number;
    outputBytes: number;
    renamedBindings: number;
    renamedProperties: number;
    addedDepthReferences: number;
    obfuscatedStrings: number;
    obfuscatedNumbers: number;
    obfuscatedBooleans: number;
    elapsedMs: number;
}

export interface ObfuscateCodeResult {
    code: string;
    renamedBindings: number;
    renamedProperties: number;
    addedDepthReferences: number;
    obfuscatedStrings: number;
    obfuscatedNumbers: number;
    obfuscatedBooleans: number;
}

export async function obfuscateFile(opts: ObfuscateFileOptions): Promise<ObfuscationStats> {
    const startedAt = performance.now();
    const input = path.resolve(opts.input);
    const output = path.resolve(opts.output);

    const bundle = await bundleInput(input);
    const transformed = obfuscateCode(bundle.code);
    const compacted = await compactOutput(transformed.code);

    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, compacted, "utf-8");

    return {
        input,
        output,
        bundledBytes: bundle.bytes,
        outputBytes: compacted.length,
        renamedBindings: transformed.renamedBindings,
        renamedProperties: transformed.renamedProperties,
        addedDepthReferences: transformed.addedDepthReferences,
        obfuscatedStrings: transformed.obfuscatedStrings,
        obfuscatedNumbers: transformed.obfuscatedNumbers,
        obfuscatedBooleans: transformed.obfuscatedBooleans,
        elapsedMs: performance.now() - startedAt,
    };
}

export function obfuscateCode(input: string): ObfuscateCodeResult {
    const ast = babelParser.parse(input, {
        sourceType: "module",
        strictMode: false,
        allowReturnOutsideFunction: true,
    });

    const names = new NameGenerator();

    const firstBindingPass = renameBindings(ast, names);
    const propertyResult = renameProperties(ast, names);
    const depthResult = addUnnecessaryDepth(ast, names);
    const literalResult = obfuscateLiterals(ast, names);

    insertHelperStatements(ast, literalResult.helperNodes);
    const helperBindingPass = renameBindings(ast, names);

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
    };
}
