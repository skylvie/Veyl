import * as babelParser from "@babel/parser";
import type { ObfuscationConfigInput } from "@skylvi/veyl-config/browser";
import { resolveConfig } from "@skylvi/veyl-config/browser";
import { generate } from "../babel/interop.js";
import { buildRuntimeHelpers, insertHelperStatements } from "../runtime/index.js";
import { flattenControlFlow } from "../transforms/controlFlowFlattening.js";
import { injectDeadCode } from "../transforms/deadCodeInjector.js";
import {
    resolveBrowserExecutionWrapperMode,
    wrapProgramWithBrowserExecutionMode,
} from "../transforms/execution/browserWrapper.js";
import { renameBindings } from "../transforms/identifierRenamer.js";
import { obfuscateLiterals } from "../transforms/literalObfuscator.js";
import { renameProperties } from "../transforms/propertyRenamer.js";
import { simplifyStatements } from "../transforms/simplifier.js";
import { addUnnecessaryDepth } from "../transforms/unnecessaryDepth.js";
import type { ObfuscateCodeResult } from "../types/core.js";
import { NameGenerator } from "../utils/random.js";

export function obfuscateCodeInBrowser(
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
    const executionWrapperMode = resolveBrowserExecutionWrapperMode(config.features);

    if (executionWrapperMode !== null) {
        literalResult.stringCount += wrapProgramWithBrowserExecutionMode(
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
        compact: config.minify,
        minified: config.minify,
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
