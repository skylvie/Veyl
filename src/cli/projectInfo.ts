import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";

interface PackageInfo {
    name: string;
    version: string;
}

export function buildVersionText(): string {
    const info = readPackageInfo();

    return [
        `${chalk.cyan.bold(info.name)} ${chalk.gray(info.version)}`,
        chalk.gray("JavaScript/TypeScript obfuscator"),
        `${chalk.gray("author:")} ${chalk.green("Sylvie Rain (skylvi)")}`,
        `${chalk.gray("license:")} ${chalk.green("MIT")}`,
    ].join("\n");
}

function readPackageInfo(): PackageInfo {
    const fallback: PackageInfo = {
        name: "veyl",
        version: "unknown",
    };
    const packagePath = findPackageJson(path.dirname(fileURLToPath(import.meta.url)));

    if (packagePath === null) {
        return fallback;
    }

    const parsed: unknown = JSON.parse(fs.readFileSync(packagePath, "utf-8"));

    if (!isPackageInfo(parsed)) {
        return fallback;
    }

    return {
        name: parsed.name,
        version: parsed.version,
    };
}

function findPackageJson(startDir: string): string | null {
    let currentDir = startDir;

    while (true) {
        const candidate = path.join(currentDir, "package.json");

        if (fs.existsSync(candidate)) {
            return candidate;
        }

        const parentDir = path.dirname(currentDir);

        if (parentDir === currentDir) {
            return null;
        }

        currentDir = parentDir;
    }
}

function isPackageInfo(input: unknown): input is PackageInfo {
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
        return false;
    }

    const value = input as Record<string, unknown>;

    return typeof value.name === "string" && typeof value.version === "string";
}
