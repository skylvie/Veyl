import type { ObfuscationConfig } from "@skylvi/veyl/browser";

export const SAMPLE_SOURCE = `const add = (left: number, right: number) => left + right;
const label = "demo";

const greet = (name: string) => {
    const enabled = true;
    const score = 42;
    const tags = ["veyl", "browser", "playground"];

    if (!enabled) {
        return "disabled";
    }

    return \`\${label}: \${name} -> \${add(score, 8)} / \${tags.join("-")}\`;
};

console.log(greet("Sylvie"));
`;

export interface SelectOption {
    label: string;
    value: string;
}

export interface ToggleField {
    kind: "toggle";
    path: string;
    label: string;
}

export interface SelectField {
    kind: "select";
    path: string;
    label: string;
    options: SelectOption[];
}

export interface TextField {
    kind: "text";
    path: string;
    label: string;
    placeholder?: string;
    hint?: string;
}

export type ConfigField = ToggleField | SelectField | TextField;

export interface ConfigSection {
    title: string;
    fields: ConfigField[];
}

export const CONFIG_SECTIONS: ConfigSection[] = [
    {
        title: "Strings",
        fields: [
            { kind: "toggle", path: "obfuscate.strings.enabled", label: "Enabled" },
            { kind: "toggle", path: "obfuscate.strings.encode", label: "Encode Chunks" },
            {
                kind: "toggle",
                path: "obfuscate.strings.unicode_escape_sequence",
                label: "Unicode Escape Sequence",
            },
            {
                kind: "select",
                path: "obfuscate.strings.method",
                label: "Method",
                options: [
                    { label: "array", value: "array" },
                    { label: "split", value: "split" },
                ],
            },
            { kind: "text", path: "obfuscate.strings.split_length", label: "Split Length" },
        ],
    },
    {
        title: "Numbers",
        fields: [
            { kind: "toggle", path: "obfuscate.numbers.enabled", label: "Enabled" },
            {
                kind: "select",
                path: "obfuscate.numbers.method",
                label: "Method",
                options: [
                    { label: "offset", value: "offset" },
                    { label: "equation", value: "equation" },
                ],
            },
            {
                kind: "text",
                path: "obfuscate.numbers.offset",
                label: "Offset",
                placeholder: "null",
                hint: "Use null for randomized/default offset.",
            },
            {
                kind: "select",
                path: "obfuscate.numbers.operator",
                label: "Operator Family",
                options: [
                    { label: "null", value: "null" },
                    { label: "+-", value: "+-" },
                    { label: "*/", value: "*/" },
                ],
            },
        ],
    },
    {
        title: "Booleans",
        fields: [
            { kind: "toggle", path: "obfuscate.booleans.enabled", label: "Enabled" },
            {
                kind: "select",
                path: "obfuscate.booleans.method",
                label: "Method",
                options: [
                    { label: "number", value: "number" },
                    { label: "depth", value: "depth" },
                ],
            },
            {
                kind: "text",
                path: "obfuscate.booleans.number",
                label: "True Token",
                placeholder: "null",
            },
            {
                kind: "text",
                path: "obfuscate.booleans.depth",
                label: "Depth",
                placeholder: "null or randomized",
            },
        ],
    },
    {
        title: "Features",
        fields: [
            {
                kind: "toggle",
                path: "features.randomized_unique_identifiers",
                label: "Randomized Identifiers",
            },
            {
                kind: "toggle",
                path: "features.unnecessary_depth",
                label: "Unnecessary Depth",
            },
            {
                kind: "toggle",
                path: "features.dead_code_injection",
                label: "Dead Code Injection",
            },
            {
                kind: "toggle",
                path: "features.control_flow_flattening",
                label: "Control Flow Flattening",
            },
            { kind: "toggle", path: "features.simplify", label: "Simplify" },
            { kind: "toggle", path: "features.functionify", label: "Functionify" },
            { kind: "toggle", path: "features.evalify", label: "Evalify" },
        ],
    },
];

export function cloneConfig(config: ObfuscationConfig): ObfuscationConfig {
    return structuredClone(config);
}

export function readAtPath(object: unknown, path: string): unknown {
    return path.split(".").reduce<unknown>((current, part) => {
        if (typeof current !== "object" || current === null) {
            return undefined;
        }

        return (current as Record<string, unknown>)[part];
    }, object);
}

export function setAtPath(object: unknown, path: string, value: unknown): void {
    if (typeof object !== "object" || object === null) {
        return;
    }

    const parts = path.split(".");
    const last = parts.pop();

    if (last === undefined) {
        return;
    }

    let current = object as Record<string, unknown>;

    for (const part of parts) {
        const next = current[part];

        if (typeof next !== "object" || next === null) {
            current[part] = {};
        }

        current = current[part] as Record<string, unknown>;
    }

    current[last] = value;
}

export function parseFieldValue(path: string, raw: string): unknown {
    if (raw === "null") {
        return null;
    }

    if (path === "obfuscate.booleans.depth" && raw === "randomized") {
        return "randomized";
    }

    if (path.endsWith(".method") || path.endsWith(".operator")) {
        return raw === "null" ? null : raw;
    }

    if (
        path === "obfuscate.strings.split_length" ||
        path === "obfuscate.numbers.offset" ||
        path === "obfuscate.booleans.number" ||
        path === "obfuscate.booleans.depth"
    ) {
        return raw.trim() === "" ? null : Number(raw);
    }

    return raw;
}
