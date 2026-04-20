# Veyl
A standalone TS/JS obfuscator made for my AP CSP create task.

## Usage
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
node dist/cli.js -i ./input.ts -o ./output.js
```

4. Optional: link the CLI command
```sh
pnpm link --global
veyl -i ./input.ts -o ./output.js
```

## Configuration System
Veyl has a verbose configuration system. By default, Veyl will check for a `veyl_config.json` file, but you can pass in the `-c` flag to specify a path. (E.g. `veyl -c config.json`).

### Config File
```jsonc
{
	"features": {
		"obfuscate": {
			"strings": true, // Do string obfuscation
			"numbers": true, // Do number obfuscation
			"booleans": true // Do boolean obfuscation
		},
		"randomized_unique_identifiers": true, // Randomize identifiers (e.g. `_0x1a2b3c`)
		"unnecessary_depth": true // Add "unnecessary" depth (explained in "How It Works" section)
	},
	"options": { // Leave these as "randomized" or `null` to use random values
		"boolean_number": 120, // Number to use as boolean representation
		"number_offset": 12, // Number to use as offset
		"number_operator": "+" // Number operator to use as offset (+, -, *, /)
	}
}
```

### CLI Flags
You can also use CLI flags instead:
```
--obfuscated-strings=true|false
--obfuscated-numbers=true|false
--obfuscated-booleans=true|false
--randomized-unique-identifiers=true|false
--number-obfuscation-offset=<num|randomized>
--number-obfuscation-operator=<+|-|*|/|randomized>
--boolean-obfuscation-number=<num|randomized>
--unnecessary-depth=true|false
```

## Testing
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

## AP CSP Create Task Evidence
The code includes the required elements:
- Input from a file: `obfuscateFile` receives the `-i` path and esbuild reads that entry file.
- Output: `obfuscateFile` writes the `-o` file and the CLI prints status text.
- List: `OPTION_DEFINITIONS` stores the supported CLI options in one list.
- Student-developed procedure: `parseCliArgs(argv)` has a parameter, return type, sequencing, selection, and iteration.
- Procedure call: `src/cli.ts` calls `parseCliArgs(process.argv.slice(2))`.
- The same list is used by both `parseCliArgs` and `buildHelpText`, which makes option changes easier to maintain.

## How It Works
Veyl starts by sending the input TS or JS file through [esbuild](https://esbuild.github.io/). esbuild transpiles TS, follows local imports, bundles the program into one ESM JS file, and tree-shakes code that is not used.

After bundling, Veyl parses the JS into an AST and applies the obfuscation passes:

- Local bindings are renamed to randomized names like `_0x1a2b3c`.
- Local object and class property names are renamed, including matching local member accesses.
- Direct function calls and class constructor calls gain an extra randomized `const` reference before invocation.
- String literals are moved into a randomized string table. Each stored string is encoded with base64, bit rotation, and XOR, then decoded at runtime by injected helper functions.
- Number literals are replaced with calls to a numeric decoder. The encoded number uses a randomized additive or multiplicative shift so the original value is not written directly in the output.
- Boolean literals are replaced with calls to a boolean decoder that compares randomized numeric tokens instead of writing `true` or `false` directly.

Once the literals have been replaced, Veyl injects the runtime helper functions needed to decode them. It then runs another binding rename pass so the helper names are obfuscated too. Finally, esbuild minifies the transformed JS while preserving the randomized identifiers.
