import * as t from "@babel/types";

export function createStringLiteralNode(
    value: string,
    unicodeEscapeSequence: boolean
): t.StringLiteral {
    const literal = t.stringLiteral(value);

    if (!unicodeEscapeSequence) {
        return literal;
    }

    literal.extra = {
        rawValue: value,
        raw: `"${toUnicodeEscapeSequence(value)}"`,
    };

    return literal;
}

function toUnicodeEscapeSequence(value: string): string {
    let output = "";

    for (const character of value) {
        const codePoint = character.codePointAt(0);

        if (codePoint === undefined) {
            continue;
        }

        if (codePoint <= 0xffff) {
            output += `\\u${codePoint.toString(16).padStart(4, "0")}`;
            continue;
        }

        const adjusted = codePoint - 0x10000;
        const highSurrogate = 0xd800 + (adjusted >> 10);
        const lowSurrogate = 0xdc00 + (adjusted & 0x3ff);

        output += `\\u${highSurrogate.toString(16).padStart(4, "0")}`;
        output += `\\u${lowSurrogate.toString(16).padStart(4, "0")}`;
    }

    return output;
}
