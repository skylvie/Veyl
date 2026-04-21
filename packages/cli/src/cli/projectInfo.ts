import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
export function readPackageVersion(): string {
    const packagePath = findPackageJson(path.dirname(fileURLToPath(import.meta.url)));

    if (packagePath === null) {
        return "unknown";
    }

    const parsed: unknown = JSON.parse(fs.readFileSync(packagePath, "utf-8"));

    if (!isPackageInfo(parsed)) {
        return "unknown";
    }

    return parsed.version;
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

    return typeof value.version === "string";
}

interface PackageInfo {
    version: string;
}
