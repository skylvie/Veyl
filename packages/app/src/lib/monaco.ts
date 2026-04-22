import { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

let configured = false;

interface MonacoLanguageApi {
    typescript: {
        typescriptDefaults: {
            setCompilerOptions(options: Record<string, unknown>): void;
        };
        ScriptTarget: {
            ES2022: number;
        };
        ModuleKind: {
            ESNext: number;
        };
    };
    json: {
        jsonDefaults: {
            setDiagnosticsOptions(options: Record<string, unknown>): void;
        };
    };
}

export function configureMonaco(): void {
    if (configured) {
        return;
    }

    window.MonacoEnvironment = {
        getWorker(_: unknown, label: string) {
            if (label === "json") {
                return new jsonWorker();
            }

            if (label === "typescript" || label === "javascript") {
                return new tsWorker();
            }

            return new editorWorker();
        },
    };

    loader.config({ monaco });

    const languageApi = monaco.languages as unknown as MonacoLanguageApi;

    languageApi.typescript.typescriptDefaults.setCompilerOptions({
        target: languageApi.typescript.ScriptTarget.ES2022,
        module: languageApi.typescript.ModuleKind.ESNext,
        allowNonTsExtensions: true,
        strict: true,
    });

    languageApi.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        allowComments: false,
        enableSchemaRequest: false,
    });

    configured = true;
}
