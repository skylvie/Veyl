# Veyl
A standalone TS/JS obfuscator made for my AP CSP create task.

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
pnpm --filter @skylvi/veyl-cli link --global
veyl -i ./input.ts -o ./output.js
```

## Configuration System
Veyl has a verbose configuration system. By default, Veyl will check for a `veyl_config.json` file, but you can pass in the `-c` flag to specify a path. (E.g. `veyl -c config.json`).

### Config File
```jsonc
{
	"log_level": "info",
	"features": {
		"obfuscate": {
			"strings": true, // Do string obfuscation
			"numbers": true, // Do number obfuscation
			"booleans": true // Do boolean obfuscation
		},
		"randomized_unique_identifiers": true, // Randomize identifiers (e.g. `_0x1a2b3c`)
		"unnecessary_depth": true, // Add "unnecessary" depth (explained in "How It Works" section)
		"functionify": false // Run the final program body through `new Function(...)`
	},
	"options": { // Leave these as "randomized" or `null` to use random values
		"minify": true, // Run the final esbuild minify pass
		"boolean_number": 120, // Number to use as boolean representation
		"number_offset": 12, // Number to use as offset
		"number_operator": "+" // Number operator to use as offset (+, -, *, /)
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
--obfuscated-strings=true|false
--obfuscated-numbers=true|false
--obfuscated-booleans=true|false
--randomized-unique-identifiers=true|false
--minify=true|false
--functionify=true|false
--number-obfuscation-offset=<num|randomized>
--number-obfuscation-operator=<+|-|*|/|randomized>
--boolean-obfuscation-number=<num|randomized>
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
        features: {
            obfuscate: {
                strings: true,
                numbers: true,
                booleans: true,
            },
            randomized_unique_identifiers: true,
            unnecessary_depth: true,
        },
        options: {
            minify: true,
            boolean_number: null,
            number_offset: null,
            number_operator: null,
        },
    },
});

console.log(stats.output, stats.outputBytes);
```

### Obfuscate Code Directly
```ts
import { obfuscateCode } from "@skylvi/veyl";

const result = obfuscateCode("const answer = 42; console.log(answer);", {
    features: {
        obfuscate: {
            strings: false,
            numbers: true,
            booleans: true,
        },
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
- Types: `ObfuscationConfigInput`, `ObfuscationConfig`, `ObfuscationStats`, `ObfuscateFileOptions`, `ObfuscateCodeResult`, `LogLevel`, and `NumberObfuscationOperator`.

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

## TODO
- [ ] Fake sourcemap generation
- [ ] Deadcode injection

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
  core/  # @skylvi/veyl API package
  cli/   # @skylvi/veyl-cli executable package
```

## How It Works
Veyl starts by sending the input TS or JS file through [esbuild](https://esbuild.github.io/). esbuild transpiles TS, follows local imports, bundles the program into one ESM JS file, and tree-shakes code that is not used.

After bundling, Veyl parses the JS into an AST and applies the obfuscation passes:

- Local bindings are renamed to randomized names like `_0x1a2b3c`.
- Local object and class property names are renamed, including matching local member accesses.
- Direct function calls and class constructor calls gain an extra randomized `const` reference before invocation.
- String literals are moved into a randomized string table. Each stored string is encoded with base64, bit rotation, and XOR, then decoded at runtime by injected helper functions.
- Number literals are replaced with calls to a numeric decoder. The encoded number uses a randomized additive or multiplicative shift so the original value is not written directly in the output.
- Boolean literals are replaced with calls to a boolean decoder that compares randomized numeric tokens instead of writing `true` or `false` directly.
- When `features.functionify` is enabled, Veyl stringifies the transformed program body, obfuscates that body string, and executes it through `new Function(...)` while passing imported bindings and helper functions in as runtime arguments.

Once the literals have been replaced, Veyl injects the runtime helper functions needed to decode them. It then runs another binding rename pass so the helper names are obfuscated too. By default, esbuild minifies the transformed JS while preserving the randomized identifiers, but you can disable that final minify step with `options.minify` or `--minify=false`.

## AP CSP Create Task Evidence
The code includes the required elements:
- Input from a file: `obfuscateFile` receives the `-i` path and esbuild reads that entry file.
- Output: `obfuscateFile` writes the `-o` file and the CLI prints status text.
- Command interface: `buildCliProgram(versionText)` defines the Commander-based CLI, including required input/output arguments and config overrides.
- Student-developed procedure: `buildConfigOverrides(parsed)` converts parsed CLI values into `ObfuscationConfigInput` overrides through sequencing and selection.
- Procedure call: `packages/cli/src/cli.ts` builds the command, parses `process.argv.slice(2)`, resolves config, and then calls `obfuscateFile(...)`.
- Validation: Commander argument parsers such as `parseBoolean`, `parseNumberOrRandomized`, and `parseLogLevel` enforce allowed CLI values before execution continues.
