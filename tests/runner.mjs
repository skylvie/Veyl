import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { getCases } from "./cases.mjs";

const rootDir = path.resolve(import.meta.dirname, "..");
const testDir = path.resolve(rootDir, "tests");
const casesDir = path.resolve(testDir, "cases");
const tscBin = path.resolve(rootDir, "node_modules", ".bin", "tsc");
const cliEntry = path.resolve(rootDir, "packages", "cli", "dist", "index.js");
const coreDistEntry = path.resolve(rootDir, "packages", "core", "dist", "index.js");
const configDistEntry = path.resolve(rootDir, "packages", "config", "dist", "index.js");

const options = parseArgs(process.argv.slice(2));
const color = {
    green: "\u001b[32m",
    red: "\u001b[31m",
    blue: "\u001b[34m",
    gray: "\u001b[90m",
    bold: "\u001b[1m",
    reset: "\u001b[0m",
};

if (options.removeGeneratedJs) {
    cleanupAllArtifacts();
    process.exit(0);
}

const cases = getCases(casesDir);
const failures = [];
let passedCount = 0;

for (const testCase of cases) {
    try {
        const result = runCase(testCase, options);
        passedCount++;
        printCasePass(result);
    } catch (error) {
        const failure = formatFailure(testCase.name, error);
        failures.push(failure);
        printFailure(failure);
    }
}

try {
    const distResults = await runDistChecks();

    for (const result of distResults) {
        passedCount++;
        printDistPass(result);
    }
} catch (error) {
    const failure = formatFailure("dist", error);
    failures.push(failure);
    printFailure(failure);
}

printSummary(passedCount, failures.length);

if (failures.length > 0) {
    throw new Error(`Test failures:\n\n${failures.join("\n\n")}`);
}

function parseArgs(argv) {
    const parsed = {
        keepJs: false,
        keepOut: false,
        removeGeneratedJs: false,
    };

    for (const arg of argv) {
        switch (arg) {
            case "--keep-js":
                parsed.keepJs = true;
                break;
            case "--keep-out":
                parsed.keepOut = true;
                break;
            case "--rm-js":
                parsed.removeGeneratedJs = true;
                break;
            default:
                throw new Error(
                    `Unknown option: ${arg}\nUsage: node tests/runner.mjs [--keep-js|--keep-out|--rm-js]`
                );
        }
    }

    return parsed;
}

function runCase(testCase, options) {
    const entryTsPath = path.resolve(testCase.dir, testCase.entry);
    const entryJsPath = replaceExtension(entryTsPath, ".js");
    const outPath = path.resolve(testCase.dir, "out.js");
    const generatedJsFiles = collectTypeScriptFiles(testCase.dir).map((file) =>
        replaceExtension(file, ".js")
    );
    const tsRuntimeDir = path.resolve(testCase.dir, ".ts-runtime");

    cleanupArtifacts(generatedJsFiles, outPath, tsRuntimeDir);

    const sourceStdout = runTypeScriptCase(testCase.dir, testCase.entry).trim();

    run(
        tscBin,
        [
            "--ignoreconfig",
            "--module",
            "nodenext",
            "--target",
            "esnext",
            "--skipLibCheck",
            ...collectTypeScriptFiles(testCase.dir),
        ],
        rootDir
    );

    const expectedStdout = run(process.execPath, [entryJsPath], rootDir, {
        captureStdout: true,
    }).trim();
    const cliArgs = [cliEntry, "-i", entryTsPath, "-o", outPath];

    if (testCase.configFile !== undefined) {
        cliArgs.push("-c", path.resolve(testCase.dir, testCase.configFile));
    }

    if (testCase.cliArgs !== undefined) {
        cliArgs.push(...testCase.cliArgs);
    }

    run(process.execPath, cliArgs, rootDir, { captureStdout: true });

    const actualStdout = run(process.execPath, [outPath], rootDir, { captureStdout: true }).trim();

    if (sourceStdout !== expectedStdout) {
        throw new Error(
            `[${testCase.name}] ts runtime output mismatch\nsource:   ${sourceStdout}\ncompiled: ${expectedStdout}`
        );
    }

    if (expectedStdout !== actualStdout) {
        throw new Error(
            `[${testCase.name}] runtime output mismatch\nexpected: ${expectedStdout}\nactual:   ${actualStdout}`
        );
    }

    const outputCode = fs.readFileSync(outPath, "utf8");
    testCase.validate?.(outputCode);

    if (!options.keepJs) {
        cleanupFiles(generatedJsFiles);
    }

    if (!options.keepOut) {
        cleanupFiles([outPath]);
        fs.rmSync(tsRuntimeDir, { recursive: true, force: true });
    }

    return {
        name: testCase.name,
        sourceStdout,
        compiledStdout: expectedStdout,
        obfuscatedStdout: actualStdout,
    };
}

async function runDistChecks() {
    const coreDist = await import(pathToFileURL(coreDistEntry).href);
    const configDist = await import(pathToFileURL(configDistEntry).href);
    const scratchDir = path.resolve(testDir, ".tmp");

    fs.mkdirSync(scratchDir, { recursive: true });

    const mergedConfig = configDist.mergeConfig(
        {},
        {
            minify: false,
            obfuscate: {
                strings: {
                    enabled: false,
                },
                numbers: {
                    enabled: true,
                    method: "equation",
                },
                booleans: {
                    enabled: true,
                    method: "depth",
                    depth: null,
                },
            },
            features: {
                randomized_unique_identifiers: false,
                functionify: false,
            },
        }
    );
    const resolvedConfig = configDist.resolveConfig(mergedConfig);
    const apiOut = coreDist.obfuscateCode("console.log(7, true, false);", resolvedConfig);
    const apiOutPath = path.resolve(scratchDir, "api-out.js");

    fs.writeFileSync(apiOutPath, apiOut.code, "utf8");

    const apiStdout = run(process.execPath, [apiOutPath], rootDir, {
        captureStdout: true,
    }).trim();

    if (apiStdout !== "7 true false") {
        throw new Error(
            `[dist] obfuscateCode output mismatch\nexpected: 7 true false\nactual:   ${apiStdout}`
        );
    }

    assertContains(apiOut.code, "![]", "[dist] depth boolean mode should emit negation syntax");
    assertNotContains(
        apiOut.code,
        "TextDecoder",
        "[dist] helperless API case should not inject string helpers"
    );

    const fileCaseDir = path.resolve(casesDir, "functionality");
    const fileOutPath = path.resolve(scratchDir, "file-out.js");
    const fileStats = await coreDist.obfuscateFile({
        input: path.resolve(fileCaseDir, "entry.ts"),
        output: fileOutPath,
        config: {
            minify: false,
            obfuscate: {
                strings: {
                    enabled: true,
                    encode: false,
                    unicode_escape_sequence: true,
                    method: "split",
                    split_length: 2,
                },
                numbers: {
                    enabled: false,
                },
                booleans: {
                    enabled: false,
                },
            },
            features: {
                randomized_unique_identifiers: false,
                unnecessary_depth: false,
                dead_code_injection: false,
                control_flow_flattening: false,
                simplify: false,
                functionify: false,
            },
        },
    });
    const fileCode = fs.readFileSync(fileOutPath, "utf8");
    const fileStdout = run(process.execPath, [fileOutPath], rootDir, {
        captureStdout: true,
    }).trim();

    if (!fileStdout.includes("import-ok:module-string:5")) {
        throw new Error("[dist] obfuscateFile should produce executable output");
    }

    if (typeof fileStats.outputBytes !== "number" || fileStats.outputBytes <= 0) {
        throw new Error("[dist] obfuscateFile should return populated stats");
    }

    assertContains(fileCode, "\\u", "[dist] obfuscateFile should preserve unicode escaped strings");

    cleanupFiles([apiOutPath, fileOutPath]);
    fs.rmSync(scratchDir, { recursive: true, force: true });

    return [
        {
            name: "obfuscateCode",
            output: apiStdout,
        },
        {
            name: "obfuscateFile",
            output: fileStdout,
        },
    ];
}

function collectTypeScriptFiles(caseDir) {
    const entries = fs.readdirSync(caseDir, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const fullPath = path.resolve(caseDir, entry.name);

        if (entry.isDirectory()) {
            if (entry.name.startsWith(".")) {
                continue;
            }

            files.push(...collectTypeScriptFiles(fullPath));
            continue;
        }

        if (entry.isFile() && fullPath.endsWith(".ts")) {
            files.push(fullPath);
        }
    }

    return files.sort();
}

function cleanupAllArtifacts() {
    for (const caseName of fs.readdirSync(casesDir)) {
        const caseDir = path.resolve(casesDir, caseName);

        if (!fs.statSync(caseDir).isDirectory()) {
            continue;
        }

        const generatedJsFiles = collectTypeScriptFiles(caseDir).map((file) =>
            replaceExtension(file, ".js")
        );

        cleanupArtifacts(
            generatedJsFiles,
            path.resolve(caseDir, "out.js"),
            path.resolve(caseDir, ".ts-runtime")
        );
    }
}

function cleanupArtifacts(generatedJsFiles, outPath, tsRuntimeDir) {
    cleanupFiles([...generatedJsFiles, outPath]);

    if (tsRuntimeDir !== undefined && fs.existsSync(tsRuntimeDir)) {
        fs.rmSync(tsRuntimeDir, { recursive: true, force: true });
    }
}

function cleanupFiles(files) {
    for (const file of files) {
        if (fs.existsSync(file)) {
            fs.rmSync(file, { force: true });
        }
    }
}

function replaceExtension(filePath, extension) {
    return `${filePath.slice(0, filePath.lastIndexOf("."))}${extension}`;
}

function assertContains(haystack, needle, message) {
    if (!haystack.includes(needle)) {
        throw new Error(message);
    }
}

function assertNotContains(haystack, needle, message) {
    if (haystack.includes(needle)) {
        throw new Error(message);
    }
}

function run(command, args, cwd, options = {}) {
    const result = execFileSync(command, args, {
        cwd,
        encoding: "utf8",
        stdio: options.captureStdout ? ["ignore", "pipe", "inherit"] : "inherit",
    });

    return result ?? "";
}

function runTypeScriptCase(caseDir, entryFile) {
    const runtimeDir = path.resolve(caseDir, ".ts-runtime");

    fs.rmSync(runtimeDir, { recursive: true, force: true });
    fs.mkdirSync(runtimeDir, { recursive: true });
    fs.writeFileSync(
        path.resolve(runtimeDir, "package.json"),
        JSON.stringify({ type: "module" }, null, 4),
        "utf8"
    );

    for (const file of collectTypeScriptFiles(caseDir)) {
        const relativePath = path.relative(caseDir, file);
        const targetPath = path.resolve(runtimeDir, relativePath);

        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, rewriteTypeScriptImports(fs.readFileSync(file, "utf8")), "utf8");
    }

    return run(process.execPath, [path.resolve(runtimeDir, entryFile)], rootDir, {
        captureStdout: true,
    });
}

function rewriteTypeScriptImports(source) {
    return source.replaceAll(".js\"", '.ts"').replaceAll(".js'", ".ts'");
}

function formatFailure(name, error) {
    if (error instanceof Error) {
        return `[${name}] ${error.message}`;
    }

    return `[${name}] ${String(error)}`;
}

function printCasePass(result) {
    console.log(`${color.green}[PASS]${color.reset} ${color.bold}${result.name}${color.reset}`);
    console.log(`  ${color.gray}ts :${color.reset} ${result.sourceStdout}`);
    console.log(`  ${color.gray}js :${color.reset} ${result.compiledStdout}`);
    console.log(`  ${color.gray}obf:${color.reset} ${result.obfuscatedStdout}`);
}

function printDistPass(result) {
    console.log(`${color.blue}[DIST]${color.reset} ${color.bold}${result.name}${color.reset}`);
    console.log(`  ${color.gray}out:${color.reset} ${result.output}`);
}

function printFailure(failure) {
    console.log(`${color.red}[FAIL]${color.reset} ${failure}`);
}

function printSummary(passed, failed) {
    console.log("");
    console.log(`${color.bold}Summary${color.reset}`);
    console.log(`  ${color.green}passed${color.reset}: ${passed}`);
    console.log(`  ${failed > 0 ? color.red : color.gray}failed${color.reset}: ${failed}`);
}
