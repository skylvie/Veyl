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

Veyl will also read `./veyl_config.json` by default when that file exists. Pass a different config file with `-c`:
```sh
node dist/cli.js -i ./input.ts -o ./output.js -c ./config.json
```

Supported CLI overrides:
```sh
--obfuscated-strings=false|true
--obfuscated-numbers=false|true
--obfuscated-booleans=false|true
--randomized-unique-identifiers=false|true
--number-obfuscation-offset=<num|randomized>
--number-obfuscation-operator=<+|-|*|/|randomized>
--boolean-obfuscation-number=<num|randomized>
--unnecessary-depth=false|true
```

Example config file:
```json
{
    "features": {
        "obfuscate": {
            "strings": true,
            "numbers": true,
            "booleans": true
        },
        "randomized_unique_identifiers": true,
        "unnecessary_depth": true
    },
    "options": {
        "boolean_number": 120,
        "number_offset": 12,
        "number_operator": "+"
    }
}
```

Use `null` or `"randomized"` for `boolean_number`, `number_offset`, or `number_operator` to use randomized defaults.

4. Optional: link the CLI command
```sh
pnpm link --global
veyl -i ./input.ts -o ./output.js
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
