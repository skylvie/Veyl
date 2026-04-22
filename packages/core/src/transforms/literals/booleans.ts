import crypto from "node:crypto";
import * as t from "@babel/types";
import type { ObfuscationConfig } from "@skylvi/veyl-config";
import { traverse } from "../../babel/interop.js";
import type { BabelNode, BabelNodePath } from "../../types/babel.js";
import type { LiteralObfuscationResult } from "../../types/transforms.js";
import type { NameGenerator } from "../../utils/random.js";

export function obfuscateBooleanLiterals(
    ast: object,
    names: NameGenerator,
    config: ObfuscationConfig,
    runtimeOptions: LiteralObfuscationResult["runtimeOptions"]
): { count: number; trueToken: number | null } {
    let booleanCount = 0;
    let booleanNumber: number | null = null;

    if (!config.obfuscate.booleans.enabled) {
        return {
            count: booleanCount,
            trueToken: booleanNumber,
        };
    }

    const boolDecoderName = names.freshIdentifier();
    const trueToken = config.obfuscate.booleans.number ?? crypto.randomInt(10000, 99999);
    let falseToken = crypto.randomInt(10000, 99999);

    booleanNumber = trueToken;

    while (falseToken === trueToken) {
        falseToken = crypto.randomInt(10000, 99999);
    }

    traverse(ast, {
        BooleanLiteral(pathNode: BabelNodePath) {
            if (!pathNode.node || typeof pathNode.node.value !== "boolean") {
                return;
            }

            const marker = pathNode.node.value ? trueToken : falseToken;

            pathNode.replaceWith(
                t.callExpression(t.identifier(boolDecoderName), [
                    t.numericLiteral(marker),
                ]) as unknown as BabelNode
            );

            booleanCount++;
        },
    });

    if (booleanCount > 0) {
        runtimeOptions.booleans = {
            decoderName: boolDecoderName,
            trueToken,
        };
    }

    return {
        count: booleanCount,
        trueToken: booleanNumber,
    };
}
