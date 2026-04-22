# Repository Guidelines

## Project Structure & Module Organization
This repo is a `pnpm` workspace with four main packages under `packages/`:
- `packages/app`: the Vite + Monaco browser playground for experimenting with Veyl.
- `packages/core`: the `@skylvi/veyl` library and AST transforms.
- `packages/cli`: the CLI entrypoint and argument/config handling.
- `packages/config`: shared config types, defaults, loading, and validation.

Project docs live in `docs/`. Integration-style test fixtures live in `tests/cases/`, and the main test runner is `tests/runner.mjs`. Generated output such as `out.js` should not be treated as source.

## Build, Test, and Development Commands
- `pnpm build`: builds all workspace packages.
- `pnpm cli`: runs the built CLI locally.
- `pnpm dev`: runs the Vite dev server for `packages/app`.
- `pnpm preview`: runs the Vite preview server for `packages/app`.
- `pnpm typecheck`: runs TypeScript checks across the workspace.
- `pnpm lint`: runs Biome lint on `packages/`.
- `pnpm lint:fix`: applies lint fixes.
- `pnpm format`: formats `packages/` with Biome.
- `pnpm check`: runs Biome checks and safe fixes.
- `pnpm test`: runs `tests/runner.mjs`.

Before submitting changes, at minimum run `pnpm check`, `pnpm test`, and `pnpm build`.

## Coding Style & Naming Conventions
Biome defines formatting: 4-space indentation, 100-column width, double quotes, semicolons, and ES5 trailing commas. Follow existing file naming patterns:
- transforms/utilities: `camelCase.ts`
- docs: descriptive lowercase names like `docs/how_it_works.md`

Keep changes scoped. Prefer editing source in `packages/`. When behavior, config, CLI flags, or the public API change, update the relevant docs, refresh the example config when needed, and add or adjust tests to cover the change.

## Testing Guidelines
This project uses the case-based runner in `tests/runner.mjs`. Add or update fixtures in `tests/cases/` when changing emitted code behavior. If a transform changes output shape, verify both build success and runtime behavior.
