# API

## Obfuscate a File
```ts
import { obfuscateFile } from "@skylvi/veyl";

const stats = await obfuscateFile({
    input: "./src/index.ts",
    output: "./dist/index.obfuscated.js",
    config: {
        obfuscate: {
            strings: { enabled: false },
            numbers: { enabled: true },
            booleans: { enabled: true },
        },
        features: {
            randomized_unique_identifiers: true,
            functionify: true,
            evalify: false,
            node_vm: false,
        },
    },
});

console.log(stats.output, stats.outputBytes);
```

## Obfuscate Code Directly
```ts
import { obfuscateCode } from "@skylvi/veyl";

const result = obfuscateCode("const answer = 42; console.log(answer);", {
    obfuscate: {
        strings: { enabled: false },
        numbers: { enabled: true },
        booleans: { enabled: true },
    },
    features: {
        randomized_unique_identifiers: true,
        functionify: false,
        evalify: false,
        node_vm: false,
    },
});

console.log(result.code);
```

## Public Exports
- `obfuscateFile(opts)`: bundles an input TS/JS file, obfuscates it, writes output, and returns `ObfuscationStats`.
- `obfuscateCode(input, config?)`: obfuscates an already-bundled JavaScript string and returns `ObfuscateCodeResult`.
- `resolveConfig(config?)`: fills a partial config with Veyl defaults.
- `mergeConfig(base, override)`: merges config file values with overrides.
- `loadConfigFile(path)`: reads a config JSON file.
- `loadDefaultConfigFile(cwd)`: reads `veyl_config.json` from a directory when present.
- `DEFAULT_CONFIG_FILE` and `DEFAULT_OBFUSCATION_CONFIG`.
- Types: `ObfuscationConfigInput`, `ObfuscationConfig`, `ObfuscationStats`, `ObfuscateFileOptions`, `ObfuscateCodeResult`, `LogLevel`, `NumberObfuscationMethod`, `BooleanObfuscationMethod`, and `NumberObfuscationOperator`.
