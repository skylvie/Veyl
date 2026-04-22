import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1];
const base =
    process.env.GITHUB_ACTIONS === "true" && repositoryName !== undefined
        ? `/${repositoryName}/`
        : "/";

export default defineConfig({
    base,
    plugins: [react(), tailwindcss()],
    define: {
        "process.env": {},
        process: {
            env: {},
        },
    },
    resolve: {
        alias: {
            "@skylvi/veyl/browser": path.resolve(__dirname, "../core/src/browser.ts"),
            "@skylvi/veyl-config/browser": path.resolve(__dirname, "../config/src/browser.ts"),
        },
    },
    server: {
        port: 4173,
    },
});
