import { bytesToBase64, randomHex, randomInt } from "./platform.js";

// Generate unique identifiers (Ex. "_0x1a2b3c")
export class NameGenerator {
    private readonly taken = new Set<string>();

    freshIdentifier(): string {
        let id: string;

        do {
            id = `_0x${randomHex(3)}`;
        } while (this.taken.has(id));

        this.taken.add(id);
        return id;
    }
}

// Generate random ASCII strings (Ex. "aZ3fG9")
export function randomAsciiString(minLen = 5, maxLen = 14): string {
    const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const length = randomInt(minLen, maxLen + 1);

    let out = "";

    for (let i = 0; i < length; i++) {
        out += alphabet[randomInt(0, alphabet.length)];
    }

    return out;
}

// base64 encode + rotate left by 2 bits + xor with key (Used for string literal obfuscation)
export function encodeStringLiteralValue(input: string, key: number): string {
    const source = new TextEncoder().encode(input);
    const transformed = new Uint8Array(source.length);

    for (let i = 0; i < source.length; i++) {
        const xored = source[i] ^ key;
        transformed[i] = ((xored << 2) | (xored >>> 6)) & 0xff;
    }

    return bytesToBase64(transformed);
}
