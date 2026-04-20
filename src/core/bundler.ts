import esbuild from "esbuild";
import type { BundleResult } from "../types/core.js";

// TS/JS -> JS (+ bundling & tree shaking)
export async function bundleInput(input: string): Promise<BundleResult> {
    const build = await esbuild.build({
        entryPoints: [input],
        bundle: true,
        platform: "node",
        format: "esm",
        target: "esnext",
        packages: "external",
        treeShaking: true,
        write: false,
        logLevel: "silent",
    });

    if (build.errors.length > 0) {
        const message = build.errors.map((err) => err.text).join("\n");
        throw new Error(message);
    }

    const code = new TextDecoder().decode(build.outputFiles[0].contents);

    return {
        code,
        bytes: code.length,
    };
}

// Minify output/obfuscated code but keep randomized identifiers
export async function compactOutput(code: string, minifyIdentifiers: boolean): Promise<string> {
    const result = await esbuild.transform(code, {
        minifyWhitespace: true,
        minifySyntax: true,
        minifyIdentifiers,
        format: "esm",
        target: "esnext",
    });

    return result.code;
}
