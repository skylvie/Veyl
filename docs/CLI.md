# CLI

## Installation
```sh
pnpm i -g @skylvi/veyl-cli
```

## Basic Usage
```sh
veyl -i ./input.ts -o ./output.js
```

## Install From Source
```sh
git clone https://github.com/skylvie/veyl
cd veyl
pnpm install
pnpm build
node packages/cli/dist/index.js -i ./input.ts -o ./output.js
```
Optional global link:
```sh
pnpm add -g "$PWD/packages/cli"
veyl -i ./input.ts -o ./output.js
```

## CLI Flags
```text
--strings-enabled=true|false
--strings-encode=true|false
--strings-ues=true|false
--strings-method=array|split
--strings-split-length=<num>
--numbers-enabled=true|false
--numbers-method=offset|equation
--numbers-offset=<num|randomized>
--numbers-operator=+-|*/|randomized
--booleans-enabled=true|false
--booleans-method=number|depth
--booleans-number=<num|randomized>
--boolean-depth=<num|randomized>
--randomized-unique-identifiers=true|false
--minify=true|false
--functionify=true|false
--evalify=true|false
--node-vm=true|false
--dead-code-injection=true|false
--control-flow-flattening=true|false
--simplify=true|false
--unnecessary-depth=true|false
--log-level=none|error|info|debug
```

Only one of `--functionify`, `--evalify`, or `--node-vm` can be enabled at a time.

## Log Levels
- `none`: print nothing
- `error`: print errors only
- `info`: print progress updates only
- `debug`: print paths, resolved config, and summary details
