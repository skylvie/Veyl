function getCryptoApi(): Crypto {
    const cryptoApi = globalThis.crypto;

    if (cryptoApi === undefined) {
        throw new Error("A Web Crypto compatible runtime is required");
    }

    return cryptoApi;
}

export function randomInt(minInclusive: number, maxExclusive: number): number {
    if (!Number.isInteger(minInclusive) || !Number.isInteger(maxExclusive)) {
        throw new Error("randomInt bounds must be integers");
    }

    if (maxExclusive <= minInclusive) {
        throw new Error("randomInt max must be greater than min");
    }

    const range = maxExclusive - minInclusive;
    const maxUint32 = 0x1_0000_0000;
    const limit = maxUint32 - (maxUint32 % range);
    const cryptoApi = getCryptoApi();
    const bucket = new Uint32Array(1);

    while (true) {
        cryptoApi.getRandomValues(bucket);

        if ((bucket[0] as number) < limit) {
            return minInclusive + ((bucket[0] as number) % range);
        }
    }
}

export function randomHex(byteLength: number): string {
    const bytes = new Uint8Array(byteLength);
    getCryptoApi().getRandomValues(bytes);

    return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function bytesToBase64(bytes: Uint8Array): string {
    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    if (typeof btoa === "function") {
        return btoa(binary);
    }

    return Buffer.from(bytes).toString("base64");
}
