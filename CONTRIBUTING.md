# Contributing

## Workflow
- Fork the repository to your own account.
- Create a new branch for each change instead of working on `main`.
- Keep each branch scoped to one change or one tightly related set of changes.
- Update docs when behavior, config, CLI flags, or public API change. Make sure you also update the example config.

## Setup
```sh
git clone https://github.com/skylvie/veyl
cd veyl
pnpm install
pnpm build
```
If you are contributing from a fork, push your work to your fork and open a PR from that branch.

## Common Commands
```sh
pnpm test
pnpm lint
pnpm lint:fix
pnpm format
pnpm check
pnpm typecheck
pnpm build
```

## Required Checks
Before opening a PR, make sure your changes pass:
```sh
pnpm check
pnpm test
pnpm build
```

## Testing
```sh
pnpm test
```
Or run the shell script directly:
```sh
cd test
chmod +x ./run.sh
./run.sh

# Flags
./run.sh --keep-js
./run.sh --keep-out
./run.sh --rm-js
```

## Workspace Layout
```text
packages/
  config/ # local config parsing/resolution package
  core/   # @skylvi/veyl API package
  cli/    # @skylvi/veyl-cli executable package
```
