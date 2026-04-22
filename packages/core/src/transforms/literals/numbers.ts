import * as t from "@babel/types";
import type {
    NumberObfuscationMethod,
    NumberObfuscationOperator,
    NumberObfuscationOperatorFamily,
    ObfuscationConfig,
} from "@skylvi/veyl-config";
import { traverse } from "../../babel/interop.js";
import { isPropertyKeyNode } from "../../babel/predicates.js";
import type { BabelNode, BabelNodePath } from "../../types/babel.js";
import type { LiteralObfuscationResult } from "../../types/transforms.js";
import { randomInt } from "../../utils/platform.js";
import type { NameGenerator } from "../../utils/random.js";

const ADDITIVE_NUMBER_SHIFT_MIN = 100_000;
const ADDITIVE_NUMBER_SHIFT_MAX = 999_999;
const MULTIPLICATIVE_NUMBER_SHIFT_MIN = 100;
const MULTIPLICATIVE_NUMBER_SHIFT_MAX = 999;
const ADDITIVE_NUMBER_OPERATORS: readonly NumberObfuscationOperator[] = ["+", "-"];
const MULTIPLICATIVE_NUMBER_OPERATORS: readonly NumberObfuscationOperator[] = ["*", "/"];

export function obfuscateNumberLiterals(
    ast: object,
    names: NameGenerator,
    config: ObfuscationConfig,
    runtimeOptions: LiteralObfuscationResult["runtimeOptions"]
): { count: number; offset: number | null; operators: NumberObfuscationOperator[] } {
    let numberCount = 0;
    let numberOffset: number | null = null;
    const numberOperators = new Set<NumberObfuscationOperator>();

    if (!config.obfuscate.numbers.enabled) {
        return { count: 0, offset: null, operators: [] };
    }

    const numberMethod = config.obfuscate.numbers.method;
    const numberDecoderName = numberMethod === "offset" ? names.freshIdentifier() : undefined;
    const allowedOperators =
        numberMethod === "offset" ? pickNumberOperators(config.obfuscate.numbers.operator) : [];
    const resolvedNumberOffset =
        numberMethod === "offset"
            ? (config.obfuscate.numbers.offset ?? randomNumberOffset(allowedOperators))
            : null;
    numberOffset = resolvedNumberOffset;
    const numericLiteralPaths: BabelNodePath[] = [];

    traverse(ast, {
        NumericLiteral(pathNode: BabelNodePath) {
            if (!pathNode.node || typeof pathNode.node.value !== "number") {
                return;
            }

            if (isPropertyKeyNode(pathNode)) {
                return;
            }

            numericLiteralPaths.push(pathNode);
        },
    });

    for (const numberPath of numericLiteralPaths) {
        const original = numberPath.node?.value;

        if (typeof original !== "number") {
            continue;
        }

        numberPath.replaceWith(
            buildNumberObfuscatedExpression(
                original,
                numberMethod,
                numberDecoderName,
                allowedOperators,
                resolvedNumberOffset
            ) as unknown as BabelNode
        );

        numberCount++;
    }

    if (numberCount > 0 && numberMethod === "offset") {
        runtimeOptions.numbers = {
            decoderName: numberDecoderName as string,
            allowedOperators,
            offset: resolvedNumberOffset as number,
        };

        for (const operator of allowedOperators) {
            numberOperators.add(operator);
        }
    }

    return {
        count: numberCount,
        offset: numberOffset,
        operators: [...numberOperators],
    };
}

function pickNumberOperator(
    operators: readonly NumberObfuscationOperator[]
): NumberObfuscationOperator {
    return operators[randomInt(0, operators.length)];
}

function pickNumberOperatorFamily(): readonly NumberObfuscationOperator[] {
    return randomInt(0, 2) === 0 ? ADDITIVE_NUMBER_OPERATORS : MULTIPLICATIVE_NUMBER_OPERATORS;
}

function pickNumberOperators(
    family: NumberObfuscationOperatorFamily | null
): readonly NumberObfuscationOperator[] {
    if (family === null) {
        return pickNumberOperatorFamily();
    }

    return family === "+-" ? ADDITIVE_NUMBER_OPERATORS : MULTIPLICATIVE_NUMBER_OPERATORS;
}

function buildNumberObfuscatedExpression(
    original: number,
    method: NumberObfuscationMethod,
    numberDecoderName: string | undefined,
    allowedOperators: readonly NumberObfuscationOperator[],
    resolvedNumberOffset: number | null
): t.Expression {
    if (method === "equation") {
        return buildEquationNumberExpression(original);
    }

    if (numberDecoderName === undefined || resolvedNumberOffset === null) {
        throw new Error("offset number obfuscation requires runtime decoder state");
    }

    const numberOp = pickNumberOperator(allowedOperators);
    const opToken = encodeNumberOperator(numberOp);
    const encoded = encodeNumber(original, numberOp, resolvedNumberOffset);

    return t.callExpression(t.identifier(numberDecoderName), [
        t.numericLiteral(encoded),
        t.numericLiteral(opToken),
    ]);
}

function buildEquationNumberExpression(original: number): t.Expression {
    const ratio = toIntegerRatio(original);

    if (ratio !== null) {
        const multiplier = randomInt(2, 17);
        const denominator = ratio.denominator * multiplier;
        const target = ratio.numerator * multiplier;

        if (Number.isSafeInteger(denominator) && Number.isSafeInteger(target)) {
            return buildEquationFromScaledTarget(target, denominator);
        }
    }

    return buildFallbackEquationNumberExpression(original);
}

function buildEquationFromScaledTarget(target: number, denominator: number): t.Expression {
    const left = randomInt(0x20, 0x400);
    const right = randomInt(0x02, 0x20);
    const extra = randomInt(0x10, 0x200);
    const partial = left * right + extra;
    const correction = partial - target;
    const numerator = t.binaryExpression(
        "-",
        t.binaryExpression(
            "+",
            t.binaryExpression("*", t.numericLiteral(left), t.numericLiteral(right)),
            t.numericLiteral(extra)
        ),
        buildSignedNumericExpression(correction)
    );

    return denominator === 1
        ? numerator
        : t.binaryExpression("/", numerator, t.numericLiteral(denominator));
}

function buildFallbackEquationNumberExpression(original: number): t.Expression {
    const delta = randomInt(0x10, 0x400);

    return t.binaryExpression(
        "-",
        t.binaryExpression("+", buildSignedNumericExpression(original), t.numericLiteral(delta)),
        t.numericLiteral(delta)
    );
}

function buildSignedNumericExpression(value: number): t.Expression {
    return value >= 0
        ? t.numericLiteral(value)
        : t.unaryExpression("-", t.numericLiteral(Math.abs(value)));
}

function toIntegerRatio(value: number): { numerator: number; denominator: number } | null {
    const text = value.toString().toLowerCase();
    const [mantissaText, exponentText] = text.split("e");
    const exponent = exponentText === undefined ? 0 : Number(exponentText);

    if (!Number.isInteger(exponent)) {
        return null;
    }

    const negative = mantissaText.startsWith("-");
    const unsignedMantissa = negative ? mantissaText.slice(1) : mantissaText;
    const [wholePart, fractionalPart = ""] = unsignedMantissa.split(".");
    const digitsText = `${wholePart}${fractionalPart}`.replace(/^0+(?=\d)/, "") || "0";
    let numerator = Number(digitsText);
    let denominator = 10 ** fractionalPart.length;

    if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
        return null;
    }

    if (exponent > 0) {
        const multiplier = 10 ** exponent;

        if (!Number.isSafeInteger(multiplier) || !Number.isSafeInteger(numerator * multiplier)) {
            return null;
        }

        numerator *= multiplier;
    } else if (exponent < 0) {
        const multiplier = 10 ** -exponent;

        if (!Number.isSafeInteger(multiplier) || !Number.isSafeInteger(denominator * multiplier)) {
            return null;
        }

        denominator *= multiplier;
    }

    if (negative) {
        numerator *= -1;
    }

    const divisor = gcd(Math.abs(numerator), denominator);

    return {
        numerator: numerator / divisor,
        denominator: denominator / divisor,
    };
}

function gcd(a: number, b: number): number {
    let left = a;
    let right = b;

    while (right !== 0) {
        const remainder = left % right;
        left = right;
        right = remainder;
    }

    return left === 0 ? 1 : left;
}

function encodeNumber(
    original: number,
    operator: NumberObfuscationOperator,
    offset: number
): number {
    switch (operator) {
        case "+":
            return original + offset;
        case "-":
            return original - offset;
        case "*":
            return original * offset;
        case "/":
            return original / offset;
    }

    throw new Error(`Unsupported number operator: ${operator}`);
}

function randomNumberOffset(operators: readonly NumberObfuscationOperator[]): number {
    if (operators.includes("/")) {
        return 2 ** randomInt(1, 11);
    }

    if (operators.includes("*")) {
        return randomInt(MULTIPLICATIVE_NUMBER_SHIFT_MIN, MULTIPLICATIVE_NUMBER_SHIFT_MAX + 1);
    }

    if (operators.includes("+") || operators.includes("-")) {
        return randomInt(ADDITIVE_NUMBER_SHIFT_MIN, ADDITIVE_NUMBER_SHIFT_MAX + 1);
    }

    return 2;
}

function encodeNumberOperator(operator: NumberObfuscationOperator): number {
    switch (operator) {
        case "+":
            return 0;
        case "-":
            return 1;
        case "*":
            return 2;
        case "/":
            return 3;
    }

    throw new Error(`Unsupported number operator: ${operator}`);
}
