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
# or:
pnpm link --global
pnpm start -i ./input.ts -o ./output.js
```

4. Optional: link the CLI command
```sh
pnpm link --global
veyl -i ./input.ts -o ./output.js
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
The TS code is transpiled, bundled, and treeshaken using [esbuild](https://esbuild.github.io/) to JS code. The JS code is then obfuscated.
Obfuscation consits of many different parts. First, all identifiers are randomized and renamed to things like "_0x1a2b3c". Then, all numbers, strings, and booleans are encoded during the obfuscation script. String encoding first works by taking all strings, putting them into one global array with randomized positioning. Then, each element is base64 encoded, rotated left by 2 bits, and XOR'd. Number encoding works by generating a random offset (For example, +2, -5, etc.) and applying that to each number. Boolean encoding works by instead of using `true` or `false`, take a random number and use that for comparing. Next, string, number, and boolean decoding functions are injected into the obfuscated JS code. Then, the calls to the original strings, numbers, and booleans are replaced to calls to the correct decoding function with the encoded value passed into it. Finally, the code is minified with esbuild.
