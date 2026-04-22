import * as t from "@babel/types";
import type { ObfuscationConfig } from "@skylvi/veyl-config";
import { traverse } from "../../babel/interop.js";
import type { BabelNode, BabelNodePath } from "../../types/babel.js";
import type { LiteralObfuscationResult } from "../../types/transforms.js";
import { randomInt } from "../../utils/platform.js";
import type { NameGenerator } from "../../utils/random.js";

export function obfuscateBooleanLiterals(
    ast: object,
    names: NameGenerator,
    config: ObfuscationConfig,
    runtimeOptions: LiteralObfuscationResult["runtimeOptions"]
): { count: number; trueToken: number | null } {
    let booleanCount = 0;
    let booleanNumber: number | null = null;
    const booleanMethod = config.obfuscate.booleans.method;

    if (!config.obfuscate.booleans.enabled) {
        return {
            count: booleanCount,
            trueToken: booleanNumber,
        };
    }

    let boolDecoderName: string | null = null;
    let trueToken = 0;
    let falseToken = 0;

    if (booleanMethod === "number") {
        boolDecoderName = names.freshIdentifier();
        trueToken = config.obfuscate.booleans.number ?? randomInt(10000, 99999);
        falseToken = randomInt(10000, 99999);
        booleanNumber = trueToken;

        while (falseToken === trueToken) {
            falseToken = randomInt(10000, 99999);
        }
    }

    traverse(ast, {
        BooleanLiteral(pathNode: BabelNodePath) {
            if (!pathNode.node || typeof pathNode.node.value !== "boolean") {
                return;
            }

            pathNode.replaceWith(
                (booleanMethod === "number"
                    ? buildBooleanNumberExpression(
                          pathNode.node.value,
                          boolDecoderName,
                          trueToken,
                          falseToken
                      )
                    : buildBooleanDepthExpression(
                          pathNode.node.value,
                          resolveBooleanDepth(config.obfuscate.booleans.depth)
                      )) as unknown as BabelNode
            );

            booleanCount++;
        },
    });

    if (booleanCount > 0 && boolDecoderName !== null) {
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

function buildBooleanNumberExpression(
    value: boolean,
    decoderName: string | null,
    trueToken: number,
    falseToken: number
): t.CallExpression {
    if (decoderName === null) {
        throw new Error('boolean "number" obfuscation requires a decoder name');
    }

    return t.callExpression(t.identifier(decoderName), [
        t.numericLiteral(value ? trueToken : falseToken),
    ]);
}

function buildBooleanDepthExpression(value: boolean, baseDepth: number): t.Expression {
    const negationCount = value
        ? baseDepth % 2 === 0
            ? baseDepth
            : baseDepth + 1
        : baseDepth % 2 === 1
          ? baseDepth
          : baseDepth + 1;
    let output: t.Expression = t.arrayExpression([]);

    for (let i = 0; i < negationCount; i++) {
        output = t.unaryExpression("!", output, true);
    }

    return output;
}

function resolveBooleanDepth(configuredDepth: number | "randomized" | null): number {
    if (configuredDepth === null) {
        return 1;
    }

    if (configuredDepth === "randomized") {
        return randomInt(1, 13);
    }

    return configuredDepth;
}
