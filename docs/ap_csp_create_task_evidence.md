# AP CSP Create Task Evidence
> [!NOTE]
> This project was made for my AP CSP create task :D

The code includes the required elements:
- Input from a file: `obfuscateFile` receives the `-i` path and esbuild reads that entry file.
- Output: `obfuscateFile` writes the `-o` file and the CLI prints status text.
- Command interface: `buildCliProgram(version)` defines the Commander-based CLI, including required input/output arguments and config overrides.
- Student-developed procedure: `buildConfigOverrides(parsed)` converts parsed CLI values into `ObfuscationConfigInput` overrides through sequencing and selection.
- Procedure call: `packages/cli/src/cli.ts` builds the command, parses `process.argv.slice(2)`, resolves config, and then calls `obfuscateFile(...)`.
- Validation: Commander argument parsers such as `parseBoolean`, `parseNumberOrRandomized`, and `parseLogLevel` enforce allowed CLI values before execution continues.
