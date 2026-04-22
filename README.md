# Veyl
A complete and customizable JavaScript and TypeScript obfuscation utility

## Installation
```sh
pnpm i -g @skylvi/veyl-cli
```

### Install From Source
1. Clone the repo
```sh
git clone https://github.com/skylvie/veyl
cd veyl
```

2. Install deps & build
```sh
pnpm install
pnpm build
```

3. Run it!
```sh
node packages/cli/dist/cli.js -i ./input.ts -o ./output.js
```

4. Optional: link the CLI command
```sh
pnpm add -g "$PWD/packages/cli"
veyl -i ./input.ts -o ./output.js
```

## Configuration System
Veyl has a verbose configuration system. By default, Veyl will check for a `veyl_config.json` file, but you can pass in the `-c` flag to specify a path. (E.g. `veyl -c config.json`).

### Config File
```jsonc
{
	"log_level": "info",
	"minify": true,
	"obfuscate": {
		"strings": {
			"enabled": true, // Do string obfuscation
			"encode": true, // Encode string chunks before runtime decode
			"method": "array", // "array" or "split"
			"split_length": 3 // Chunk length when using split string obfuscation
		},
		"numbers": {
			"enabled": true, // Do number obfuscation
			"method": "offset", // "offset" or "equation"
			"offset": null, // Number offset or "randomized"/null, only for "offset"
			"operator": null // "+-", "*/", or "randomized"/null, only for "offset"
		},
		"booleans": {
			"enabled": true, // Do boolean obfuscation
			"method": "number", // "number" or "depth"
			"number": null, // Number token or "randomized"/null, only for "number"
			"depth": null // Positive integer, "randomized", or null for default ![] / !![]
		}
	},
	"features": {
		"randomized_unique_identifiers": true, // Randomize identifiers (e.g. `_0x1a2b3c`)
		"unnecessary_depth": false, // Add "unnecessary" depth (explained in "How It Works" section)
		"dead_code_injection": false, // Insert unreachable decoy code blocks
		"control_flow_flattening": false, // Flatten eligible statement runs into a state machine
		"simplify": false, // Apply compacting rewrites such as merged declarations and conditional returns
		"functionify": false // Run the final program body through `new Function(...)`
	}
}
```

Log levels:
- `none`: print nothing
- `error`: print errors only
- `info`: print progress updates only
- `debug`: print paths, resolved config, and summary details

### CLI Flags
You can also use CLI flags instead:
```
--strings-enabled=true|false
--strings-encode=true|false
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
--dead-code-injection=true|false
--control-flow-flattening=true|false
--simplify=true|false
--unnecessary-depth=true|false
--log-level=none|error|info|debug
```

## Package API
Veyl can also be imported by other Node projects as an ESM package:

```ts
import {
    obfuscateCode,
    obfuscateFile,
    resolveConfig,
    type ObfuscateCodeResult,
    type ObfuscationConfigInput,
    type ObfuscationStats,
} from "@skylvi/veyl";
```

### Obfuscate a file
```ts
import { obfuscateFile } from "@skylvi/veyl";

const stats = await obfuscateFile({
    input: "./src/index.ts",
    output: "./dist/index.obfuscated.js",
    config: {
        minify: true,
        obfuscate: {
            strings: {
                enabled: true,
                encode: true,
                method: "array",
                split_length: 3,
            },
            numbers: {
                enabled: true,
                method: "offset",
                offset: null,
                operator: null,
            },
            booleans: {
                enabled: true,
                method: "number",
                number: null,
                depth: null,
            },
        },
        features: {
            randomized_unique_identifiers: true,
            unnecessary_depth: false,
            functionify: false,
            dead_code_injection: false,
            control_flow_flattening: false,
            simplify: false,
        },
    },
});

console.log(stats.output, stats.outputBytes);
```

### Obfuscate Code Directly
```ts
import { obfuscateCode } from "@skylvi/veyl";

const result = obfuscateCode("const answer = 42; console.log(answer);", {
    obfuscate: {
        strings: {
            enabled: false,
        },
        numbers: {
            enabled: true,
        },
        booleans: {
            enabled: true,
        },
    },
    features: {
        randomized_unique_identifiers: true,
    },
});

console.log(result.code);
```

### Public exports
- `obfuscateFile(opts)`: bundles an input TS/JS file, obfuscates it, writes output, and returns `ObfuscationStats`.
- `obfuscateCode(input, config?)`: obfuscates an already-bundled JavaScript string and returns `ObfuscateCodeResult`.
- `resolveConfig(config?)`: fills a partial config with Veyl defaults.
- `mergeConfig(base, override)`: merges config file values with overrides.
- `loadConfigFile(path)`: reads a config JSON file.
- `loadDefaultConfigFile(cwd)`: reads `veyl_config.json` from a directory when present.
- `DEFAULT_CONFIG_FILE` and `DEFAULT_OBFUSCATION_CONFIG`.
- Types: `ObfuscationConfigInput`, `ObfuscationConfig`, `ObfuscationStats`, `ObfuscateFileOptions`, `ObfuscateCodeResult`, `LogLevel`, `NumberObfuscationMethod`, `BooleanObfuscationMethod`, and `NumberObfuscationOperator`.

## TODO
### Core Obfuscation Features
- [ ] Customizable identifier renaming
    - [ ] Different scope levels
    - [ ] Different name types
    - [ ] Unicode escape sequences 
- [ ] Additional string encoding methods
- [ ] Encrypted payloads with decryption key passed in
- [ ] `node:vm`

### Anti Debug
- [ ] Fake source map generation
- [ ] Disable `console`
- [ ] DevTools detection & blocking
- [ ] Domain lock
- [ ] Debug protection
- [ ] Self defending

### Other
- [ ] Webapp Demo
- [ ] Anti debug gets its own package
- [ ] Update test suite

## Testing
Make sure you're cloned into the repo first (and have ran `pnpm i`) first! Additionally, the test script only supports UNIX based shells, so no Windows nonsense.
```sh
pnpm test
```
or
```sh
cd test
chmod +x ./run.sh
./run.sh

# Flags
./run.sh --keep-js # Don't remove generated JS files
./run.sh --keep-out # Don't remove `out.js`
./run.sh --rm-js # Remove JS files
```

## Formatting and Linting
Veyl uses [Biome](https://biomejs.dev/) for formatting, import organization, and linting.

```sh
pnpm lint      # Lint src
pnpm lint:fix  # Apply lint fixes in packages
pnpm format    # Format packages
pnpm check     # Apply Biome safe fixes and checks in packages
pnpm typecheck # TypeScript only
```

## Workspace Layout
```text
packages/
  config/ # local config parsing/resolution package
  core/  # @skylvi/veyl API package
  cli/   # @skylvi/veyl-cli executable package
```

## How It Works
Veyl starts by sending the input TS or JS file through [esbuild](https://esbuild.github.io/). esbuild transpiles TS, follows local imports, bundles the program into one ESM JS file, and tree-shakes code that is not used.

After bundling, Veyl parses the JS into an AST and applies the obfuscation passes:

- Local bindings are renamed to randomized names like `_0x1a2b3c`.
- Local object and class property names are renamed, including matching local member accesses.
- Direct function calls and class constructor calls gain an extra randomized `const` reference before invocation.
- Dead code injection can insert unreachable decoy control flow and computations so the transformed program looks busier than the logic it actually executes.
- Control flow flattening can rewrite eligible straight-line statement runs into a randomized dispatcher loop so the original execution order is hidden behind a state machine.
- Simplify can merge declarations and expression chains, compact `if/else` returns into conditional expressions, and fold expression tails into comma-expression returns.
- String literals can be obfuscated through either a randomized string table or inline split concatenation. When `obfuscate.strings.encode` is enabled, chunks are encoded with base64, bit rotation, and XOR before runtime decode.
- Number literals can use either `obfuscate.numbers.method: "offset"` or `"equation"`. `offset` replaces numbers with runtime decoder calls using a randomized additive or multiplicative shift, while `equation` rewrites numbers into direct arithmetic expressions that evaluate to the same value. `obfuscate.numbers.offset` and `obfuscate.numbers.operator` only apply to `offset`.
- Boolean literals can use either `obfuscate.booleans.method: "number"` or `"depth"`. `number` replaces booleans with calls to a runtime decoder that compares randomized numeric tokens, while `depth` emits direct negation chains like `!![]` and `![]`. `obfuscate.booleans.depth` accepts a positive integer, `"randomized"`, or `null` for the default depth behavior.
- When `features.functionify` is enabled, Veyl stringifies the transformed program body, obfuscates that body string, and executes it through `new Function(...)` while passing imported bindings and helper functions in as runtime arguments.

Once the literals have been replaced, Veyl injects the runtime helper functions needed to decode or access them. It then runs another binding rename pass so the helper names are obfuscated too. By default, esbuild minifies the transformed JS while preserving the randomized identifiers, but you can disable that final minify step with `minify` or `--minify=false`.

## AP CSP Create Task Evidence
> [!NOTE]
> This project was made for my AP CSP create task :D

The code includes the required elements:
- Input from a file: `obfuscateFile` receives the `-i` path and esbuild reads that entry file.
- Output: `obfuscateFile` writes the `-o` file and the CLI prints status text.
- Command interface: `buildCliProgram(version)` defines the Commander-based CLI, including required input/output arguments and config overrides.
- Student-developed procedure: `buildConfigOverrides(parsed)` converts parsed CLI values into `ObfuscationConfigInput` overrides through sequencing and selection.
- Procedure call: `packages/cli/src/cli.ts` builds the command, parses `process.argv.slice(2)`, resolves config, and then calls `obfuscateFile(...)`.
- Validation: Commander argument parsers such as `parseBoolean`, `parseNumberOrRandomized`, and `parseLogLevel` enforce allowed CLI values before execution continues.
