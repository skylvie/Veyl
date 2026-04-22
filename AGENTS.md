# Repository Guidelines

## Project Structure & Module Organization
This repo is a `pnpm` workspace with three main packages under `packages/`:
- `packages/core`: the `@skylvi/veyl` library and AST transforms.
- `packages/cli`: the CLI entrypoint and argument/config handling.
- `packages/config`: shared config types, defaults, loading, and validation.

Project docs live in `docs/`. Integration-style test fixtures live in `test/` (`index.ts`, `module.ts`, and `test.sh`). Generated output such as `out.js` should not be treated as source.

## Build, Test, and Development Commands
- `pnpm build`: builds all workspace packages.
- `pnpm start -- -i test/index.ts -o out.js`: runs the built CLI locally.
- `pnpm typecheck`: runs TypeScript checks across the workspace.
- `pnpm lint`: runs Biome lint on `packages/`.
- `pnpm lint:fix`: applies lint fixes.
- `pnpm format`: formats `packages/` with Biome.
- `pnpm check`: runs Biome checks and safe fixes.
- `pnpm test`: runs `test/test.sh`.

Before submitting changes, at minimum run `pnpm check`, `pnpm test`, and `pnpm build`.

## Coding Style & Naming Conventions
Biome defines formatting: 4-space indentation, 100-column width, double quotes, semicolons, and ES5 trailing commas. Follow existing file naming patterns:
- transforms/utilities: `camelCase.ts`
- docs: descriptive lowercase names like `docs/how_it_works.md`

Keep changes scoped. Prefer editing source in `packages/` and updating docs when behavior, config, CLI flags, or public API change.
Docs should always be updated when a change is made. When relevant, also update the config example so it matches the current config shape and defaults.

## Testing Guidelines
This project currently uses the shell-based integration flow in `test/test.sh`. Add or update fixtures in `test/` when changing emitted code behavior. If a transform changes output shape, verify both build success and runtime behavior.
