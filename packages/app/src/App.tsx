import type { OnMount } from "@monaco-editor/react";
import Editor from "@monaco-editor/react";
import type { ObfuscateCodeResult, ObfuscationConfig } from "@skylvi/veyl/browser";
import { DEFAULT_OBFUSCATION_CONFIG, obfuscateCode, resolveConfig } from "@skylvi/veyl/browser";
import type * as Monaco from "monaco-editor";
import { useCallback, useEffect, useRef, useState } from "react";
import ts from "typescript";
import {
    CONFIG_SECTIONS,
    type ConfigField,
    cloneConfig,
    parseFieldValue,
    readAtPath,
    SAMPLE_SOURCE,
    setAtPath,
} from "./lib/config.js";
import { configureMonaco } from "./lib/monaco.js";

type ConfigTab = "controls" | "json";

configureMonaco();

export function App() {
    const [source, setSource] = useState(SAMPLE_SOURCE);
    const [config, setConfig] = useState<ObfuscationConfig>(
        cloneConfig(DEFAULT_OBFUSCATION_CONFIG)
    );
    const [configText, setConfigText] = useState(() =>
        JSON.stringify(DEFAULT_OBFUSCATION_CONFIG, null, 4)
    );
    const [configTab, setConfigTab] = useState<ConfigTab>("controls");
    const [output, setOutput] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<ObfuscateCodeResult | null>(null);
    const sourceEditorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
    const outputEditorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
    const configEditorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
    const editorsRowRef = useRef<HTMLDivElement | null>(null);
    const configPanelRef = useRef<HTMLElement | null>(null);

    const build = useCallback(
        (nextSource = source, nextConfig = config): void => {
            try {
                const transpiled = ts.transpileModule(nextSource, {
                    compilerOptions: {
                        target: ts.ScriptTarget.ES2022,
                        module: ts.ModuleKind.ESNext,
                    },
                    fileName: "playground.ts",
                    reportDiagnostics: false,
                }).outputText;
                const result = obfuscateCode(transpiled, nextConfig);

                setOutput(result.code);
                setStats(result);
                setError(null);
            } catch (caught) {
                setOutput("");
                setStats(null);
                setError(caught instanceof Error ? caught.message : "Build failed");
            }
        },
        [config, source]
    );

    useEffect(() => {
        build(source, config);
    }, [build, config, source]);

    useEffect(() => {
        const onResize = () => {
            sourceEditorRef.current?.layout();
            outputEditorRef.current?.layout();
            configEditorRef.current?.layout();
        };

        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, []);

    useEffect(() => {
        const resizeObserver = new ResizeObserver(() => {
            sourceEditorRef.current?.layout();
            outputEditorRef.current?.layout();
            configEditorRef.current?.layout();
        });

        if (editorsRowRef.current !== null) {
            resizeObserver.observe(editorsRowRef.current);
        }

        if (configPanelRef.current !== null) {
            resizeObserver.observe(configPanelRef.current);
        }

        return () => resizeObserver.disconnect();
    }, []);

    const handleSourceMount: OnMount = (editor) => {
        sourceEditorRef.current = editor;
    };

    const handleOutputMount: OnMount = (editor) => {
        outputEditorRef.current = editor;
    };

    const handleConfigMount: OnMount = (editor) => {
        configEditorRef.current = editor;
    };

    function updateConfig(path: string, value: unknown): void {
        const nextConfig = cloneConfig(config);

        if (path === "features.functionify" && value === true) {
            setAtPath(nextConfig, "features.evalify", false);
        }

        if (path === "features.evalify" && value === true) {
            setAtPath(nextConfig, "features.functionify", false);
        }

        setAtPath(nextConfig, path, value);
        setConfig(nextConfig);
        setConfigText(JSON.stringify(nextConfig, null, 4));
        build(source, nextConfig);
    }

    function handleConfigEditorChange(value: string | undefined): void {
        const nextText = value ?? "";
        setConfigText(nextText);

        try {
            const parsed = JSON.parse(nextText) as ObfuscationConfig;
            const nextConfig = cloneConfig(resolveConfig(parsed));
            setConfig(nextConfig);
            build(source, nextConfig);
        } catch {}
    }

    function resetConfig(): void {
        const nextConfig = cloneConfig(DEFAULT_OBFUSCATION_CONFIG);
        setConfig(nextConfig);
        setConfigText(JSON.stringify(nextConfig, null, 4));
        build(source, nextConfig);
    }

    function loadSample(): void {
        setSource(SAMPLE_SOURCE);
        build(SAMPLE_SOURCE, config);
    }

    return (
        <div className="min-h-screen bg-[#1e1e1e] text-sm text-[#d4d4d4]">
            <div className="mx-auto flex max-w-[1800px] flex-col gap-4 p-4">
                <header className="flex items-center justify-between gap-4 border border-[#3c3c3c] bg-[#1e1e1e] px-4 py-4">
                    <h1 className="text-2xl font-semibold tracking-tight text-[#d4d4d4]">
                        Veyl Playground
                    </h1>
                    <div className="flex gap-2">
                        <button
                            className="border border-[#3c3c3c] bg-[#252526] px-3 py-2 text-sm text-[#d4d4d4] hover:bg-[#2a2d2e]"
                            onClick={loadSample}
                            type="button"
                        >
                            Load Sample
                        </button>
                        <button
                            className="border border-[#3c3c3c] bg-[#252526] px-3 py-2 text-sm text-[#d4d4d4] hover:bg-[#2a2d2e]"
                            onClick={resetConfig}
                            type="button"
                        >
                            Reset Config
                        </button>
                    </div>
                </header>

                <div
                    className="flex min-h-[32rem] resize-y gap-4 overflow-auto border border-[#3c3c3c] bg-[#1e1e1e] p-4"
                    ref={editorsRowRef}
                >
                    <section
                        className="flex min-h-0 min-w-0 flex-1 flex-col border border-[#3c3c3c] bg-[#1e1e1e] p-4"
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-[#d4d4d4]">Source</h2>
                            <span className="text-sm text-[#808080]">TypeScript / JavaScript</span>
                        </div>
                        <div className="min-h-0 flex-1 border border-[#3c3c3c] bg-[#1e1e1e]">
                            <Editor
                                beforeMount={configureMonaco}
                                defaultLanguage="typescript"
                                onChange={(value) => setSource(value ?? "")}
                                onMount={handleSourceMount}
                                options={editorOptions}
                                theme="vs-dark"
                                value={source}
                            />
                        </div>
                    </section>

                    <section
                        className="flex min-h-0 min-w-0 flex-1 flex-col border border-[#3c3c3c] bg-[#1e1e1e] p-4"
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-[#d4d4d4]">Output</h2>
                            <div className="flex items-center gap-4">
                                <label className="flex min-h-8 items-center gap-2">
                                    <input
                                        checked={Boolean(readAtPath(config, "minify"))}
                                        className="mt-px h-4 w-4 shrink-0 accent-[#6b6b6b]"
                                        onChange={(event) =>
                                            updateConfig("minify", event.target.checked)
                                        }
                                        type="checkbox"
                                    />
                                    <span className="text-sm text-[#d4d4d4]">Minify</span>
                                </label>
                                {error !== null ? (
                                    <span className="text-sm text-[#f48771]">{error}</span>
                                ) : null}
                            </div>
                        </div>
                        <div className="min-h-0 flex-1 border border-[#3c3c3c] bg-[#1e1e1e]">
                            <Editor
                                beforeMount={configureMonaco}
                                defaultLanguage="javascript"
                                onMount={handleOutputMount}
                                options={{ ...editorOptions, readOnly: true }}
                                theme="vs-dark"
                                value={output}
                            />
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                            <StatCard label="Bindings" value={stats?.renamedBindings ?? 0} />
                            <StatCard label="Properties" value={stats?.renamedProperties ?? 0} />
                            <StatCard label="Strings" value={stats?.obfuscatedStrings ?? 0} />
                            <StatCard label="Numbers" value={stats?.obfuscatedNumbers ?? 0} />
                            <StatCard label="Booleans" value={stats?.obfuscatedBooleans ?? 0} />
                            <StatCard
                                label="Flow Blocks"
                                value={stats?.flattenedControlFlowBlocks ?? 0}
                            />
                        </div>
                    </section>
                </div>

                <section
                    className="min-h-[32rem] w-full overflow-auto border border-[#3c3c3c] bg-[#1e1e1e] p-3"
                    ref={configPanelRef}
                >
                    <div className="mb-2 flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-[#d4d4d4]">Configuration</h2>
                        <div className="flex gap-2">
                            <button
                                className={tabClass(configTab === "controls")}
                                onClick={() => setConfigTab("controls")}
                                type="button"
                            >
                                Controls
                            </button>
                            <button
                                className={tabClass(configTab === "json")}
                                onClick={() => setConfigTab("json")}
                                type="button"
                            >
                                Raw JSON
                            </button>
                        </div>
                    </div>

                    {configTab === "controls" ? (
                        <div className="grid gap-3 md:grid-cols-2">
                            {CONFIG_SECTIONS.map((section) => (
                                <div
                                    className="border border-[#3c3c3c] bg-[#252526] p-3"
                                    key={section.title}
                                >
                                    <h3 className="mb-3 text-base font-semibold text-[#d4d4d4]">
                                        {section.title}
                                    </h3>
                                    <div className="space-y-3">
                                        {section.fields.map((field) => (
                                            <Field
                                                field={field}
                                                key={field.path}
                                                onChange={updateConfig}
                                                value={readAtPath(config, field.path)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-[32rem] border border-[#3c3c3c] bg-[#1e1e1e]">
                            <Editor
                                beforeMount={configureMonaco}
                                defaultLanguage="json"
                                onChange={handleConfigEditorChange}
                                onMount={handleConfigMount}
                                options={editorOptions}
                                theme="vs-dark"
                                value={configText}
                            />
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

function Field(props: {
    field: ConfigField;
    value: unknown;
    onChange: (path: string, value: unknown) => void;
}) {
    const { field, value, onChange } = props;

    if (field.kind === "toggle") {
        return (
            <label className="flex min-h-8 items-center gap-2">
                <input
                    checked={Boolean(value)}
                    className="mt-px h-4 w-4 shrink-0 accent-[#6b6b6b]"
                    onChange={(event) => onChange(field.path, event.target.checked)}
                    type="checkbox"
                />
                <span className="text-sm text-[#d4d4d4]">{field.label}</span>
            </label>
        );
    }

    if (field.kind === "select") {
        return (
            <label className="grid gap-1">
                <span className="text-sm text-[#d4d4d4]">{field.label}</span>
                <select
                    className="h-9 w-full border border-[#3c3c3c] bg-[#3c3c3c] px-3 text-sm text-[#d4d4d4]"
                    onChange={(event) =>
                        onChange(field.path, parseFieldValue(field.path, event.target.value))
                    }
                    value={String(value)}
                >
                    {field.options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </label>
        );
    }

    return (
        <label className="grid gap-1">
            <span className="text-sm text-[#d4d4d4]">{field.label}</span>
            {field.hint !== undefined ? (
                <span className="text-[11px] leading-4 text-[#808080]">{field.hint}</span>
            ) : null}
            <input
                className="h-9 w-full border border-[#3c3c3c] bg-[#3c3c3c] px-3 text-sm text-[#d4d4d4]"
                onChange={(event) =>
                    onChange(field.path, parseFieldValue(field.path, event.target.value))
                }
                placeholder={field.placeholder}
                type="text"
                value={value === null ? "null" : String(value)}
            />
        </label>
    );
}

function StatCard(props: { label: string; value: number }) {
    return (
        <div className="border border-[#3c3c3c] bg-[#252526] px-3 py-2">
            <div className="text-xs text-[#808080]">{props.label}</div>
            <div className="mt-1 text-2xl font-semibold text-[#d4d4d4]">{props.value}</div>
        </div>
    );
}

function tabClass(active: boolean): string {
    return active
        ? "border border-[#3c3c3c] bg-[#3c3c3c] px-3 py-2 text-sm text-[#d4d4d4]"
        : "border border-[#3c3c3c] bg-[#252526] px-3 py-2 text-sm text-[#cccccc] hover:bg-[#2a2d2e]";
}

const editorOptions: Monaco.editor.IStandaloneEditorConstructionOptions = {
    automaticLayout: true,
    fontSize: 13,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
};
