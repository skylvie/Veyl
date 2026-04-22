import path from "node:path";
import type {
    BooleanObfuscationMethod,
    LogLevel,
    NumberObfuscationMethod,
    NumberObfuscationOperatorFamily,
    ObfuscationConfigInput,
    StringObfuscationMethod,
} from "@skylvi/veyl-config";
import { DEFAULT_CONFIG_FILE, mergeConfig } from "@skylvi/veyl-config";
import { Command, InvalidArgumentError, Option } from "commander";
import type { CliOptions } from "../types/cli.js";

export function resolveCliPaths(options: CliOptions, cwd: string): CliOptions {
    const publicKeyPath = options.configOverrides.features?.encryption?.public_key;
    const privateKeyPath = options.configOverrides.features?.encryption?.private_key;

    return {
        ...options,
        input: path.resolve(cwd, options.input),
        output: path.resolve(cwd, options.output),
        configFile: options.configFile === null ? null : path.resolve(cwd, options.configFile),
        configOverrides: mergeConfig(options.configOverrides, {
            features: {
                encryption: {
                    public_key:
                        publicKeyPath === undefined || publicKeyPath === null
                            ? publicKeyPath
                            : path.resolve(cwd, publicKeyPath),
                    private_key:
                        privateKeyPath === undefined || privateKeyPath === null
                            ? privateKeyPath
                            : path.resolve(cwd, privateKeyPath),
                },
            },
        }),
    };
}

export function buildCliProgram(versionText: string): Command {
    const program = new Command();

    program
        .name("veyl")
        .description("A complete and customizable JavaScript and TypeScript obfuscation utility.")
        .requiredOption("-i, --input <path>", "Input TS or JS file to bundle and obfuscate.")
        .requiredOption("-o, --output <path>", "Output JS file to write.")
        .option(
            "-c, --config <path>",
            `Config JSON file. Defaults to ./${DEFAULT_CONFIG_FILE} when present.`
        )
        .addOption(
            new Option(
                "--strings-enabled, --strings_enabled <true|false>",
                "Enable or disable string literal obfuscation."
            ).argParser((value: string) => parseBoolean(value, "--strings-enabled"))
        )
        .addOption(
            new Option(
                "--strings-encode, --strings_encode <true|false>",
                "Encode string chunks before runtime decode."
            ).argParser((value: string) => parseBoolean(value, "--strings-encode"))
        )
        .addOption(
            new Option(
                "--strings-ues, --strings_ues <true|false>",
                "Emit string literals using unicode escape sequences."
            ).argParser((value: string) => parseBoolean(value, "--strings-ues"))
        )
        .addOption(
            new Option(
                "--strings-method, --strings_method <array|split>",
                "String obfuscation method."
            ).argParser((value: string) => parseStringMethod(value, "--strings-method"))
        )
        .addOption(
            new Option(
                "--strings-split-length, --strings_split_length <num>",
                "Chunk length used by split string obfuscation."
            ).argParser((value: string) => parsePositiveInteger(value, "--strings-split-length"))
        )
        .addOption(
            new Option(
                "--numbers-enabled, --numbers_enabled <true|false>",
                "Enable or disable number literal obfuscation."
            ).argParser((value: string) => parseBoolean(value, "--numbers-enabled"))
        )
        .addOption(
            new Option(
                "--numbers-method, --numbers_method <offset|equation>",
                "Number obfuscation method."
            ).argParser((value: string) => parseNumberMethod(value, "--numbers-method"))
        )
        .addOption(
            new Option(
                "--numbers-offset, --numbers_offset <num|randomized>",
                'Number offset for "offset" numeric obfuscation.'
            ).argParser((value: string) => parseNumberOrRandomized(value, "--numbers-offset"))
        )
        .addOption(
            new Option(
                "--numbers-operator, --numbers_operator <+-|*/|randomized>",
                'Number operator family for "offset" numeric obfuscation.'
            ).argParser((value: string) => parseNumberOperatorFamily(value, "--numbers-operator"))
        )
        .addOption(
            new Option(
                "--booleans-enabled, --booleans_enabled <true|false>",
                "Enable or disable boolean literal obfuscation."
            ).argParser((value: string) => parseBoolean(value, "--booleans-enabled"))
        )
        .addOption(
            new Option(
                "--booleans-method, --booleans_method <number|depth>",
                "Boolean obfuscation method."
            ).argParser((value: string) => parseBooleanMethod(value, "--booleans-method"))
        )
        .addOption(
            new Option(
                "--booleans-number, --booleans_number <num|randomized>",
                "Numeric token used for obfuscated true values."
            ).argParser((value: string) => parseNumberOrRandomized(value, "--booleans-number"))
        )
        .addOption(
            new Option(
                "--boolean-depth, --boolean_depth <num|randomized>",
                'Negation depth used by "depth" boolean obfuscation.'
            ).argParser((value: string) =>
                parsePositiveIntegerOrRandomized(value, "--boolean-depth")
            )
        )
        .addOption(
            new Option(
                "--randomized-unique-identifiers, --randomized_unique_identifiers <true|false>",
                "Use Veyl randomized names instead of esbuild minified identifiers."
            ).argParser((value: string) => parseBoolean(value, "--randomized-unique-identifiers"))
        )
        .addOption(
            new Option(
                "--minify <true|false>",
                "Enable or disable the final esbuild minify step."
            ).argParser((value: string) => parseBoolean(value, "--minify"))
        )
        .addOption(
            new Option(
                "--functionify <true|false>",
                "Wrap the transformed program body in a runtime `new Function(...)` call."
            ).argParser((value: string) => parseBoolean(value, "--functionify"))
        )
        .addOption(
            new Option(
                "--evalify <true|false>",
                "Wrap the transformed program body in a runtime `eval(...)` call."
            ).argParser((value: string) => parseBoolean(value, "--evalify"))
        )
        .addOption(
            new Option(
                "--node-vm, --node_vm <true|false>",
                "Run the transformed program body through `node:vm` using a created context."
            ).argParser((value: string) => parseBoolean(value, "--node-vm"))
        )
        .addOption(
            new Option(
                "--public-key, --public_key <path>",
                "Encrypt wrapped payloads with the given public key."
            )
        )
        .addOption(
            new Option(
                "--private-key, --private_key <path>",
                "Embed the given private key to decrypt wrapped payloads at runtime."
            )
        )
        .addOption(
            new Option(
                "--dead-code-injection, --dead_code_injection <true|false>",
                "Insert unreachable decoy code blocks throughout the transformed program."
            ).argParser((value: string) => parseBoolean(value, "--dead-code-injection"))
        )
        .addOption(
            new Option(
                "--control-flow-flattening, --control_flow_flattening <true|false>",
                "Rewrite eligible statement sequences into flattened dispatcher loops."
            ).argParser((value: string) => parseBoolean(value, "--control-flow-flattening"))
        )
        .addOption(
            new Option(
                "--simplify <true|false>",
                "Apply compacting rewrites such as merged declarations and conditional returns."
            ).argParser((value: string) => parseBoolean(value, "--simplify"))
        )
        .addOption(
            new Option(
                "--unnecessary-depth, --unnecessary_depth <true|false>",
                "Enable or disable unnecessary depth references."
            ).argParser((value: string) => parseBoolean(value, "--unnecessary-depth"))
        )
        .addOption(
            new Option(
                "--log-level, --log_level <none|error|info|debug>",
                "Control CLI output verbosity."
            ).argParser((value: string) => parseLogLevel(value, "--log-level"))
        )
        .version(versionText, "-v, --version", "Display version number.")
        .exitOverride();

    return program;
}

export function parseCliArgs(program: Command, argv: string[]): CliOptions {
    program.parse(argv, { from: "user" });
    const parsed = program.opts<CommanderCliOptions>();

    return {
        input: parsed.input,
        output: parsed.output,
        configFile: parsed.config ?? null,
        configOverrides: buildConfigOverrides(parsed),
    };
}

export function readLogLevelFlag(argv: string[]): LogLevel | null {
    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];

        if (token !== "--log-level" && token !== "--log_level") {
            if (!token.startsWith("--log-level=") && !token.startsWith("--log_level=")) {
                continue;
            }
        }

        const value = token.includes("=")
            ? token.slice(token.indexOf("=") + 1)
            : (argv[i + 1] ?? null);

        if (value === null) {
            return null;
        }

        try {
            return parseLogLevel(value, "--log-level");
        } catch {
            return null;
        }
    }

    return null;
}

function buildConfigOverrides(parsed: CommanderCliOptions): ObfuscationConfigInput {
    const stringsEnabled = readAliasedOption(parsed, "stringsEnabled", "strings_enabled") as
        | boolean
        | undefined;
    const stringsEncode = readAliasedOption(parsed, "stringsEncode", "strings_encode") as
        | boolean
        | undefined;
    const stringsUes = readAliasedOption(parsed, "stringsUes", "strings_ues") as
        | boolean
        | undefined;
    const stringsMethod = readAliasedOption(parsed, "stringsMethod", "strings_method") as
        | StringObfuscationMethod
        | undefined;
    const stringsSplitLength = readAliasedOption(
        parsed,
        "stringsSplitLength",
        "strings_split_length"
    ) as number | undefined;
    const numbersEnabled = readAliasedOption(parsed, "numbersEnabled", "numbers_enabled") as
        | boolean
        | undefined;
    const numberMethod = readAliasedOption(parsed, "numbersMethod", "numbers_method") as
        | NumberObfuscationMethod
        | undefined;
    const numbersOffset = readAliasedOption(parsed, "numbersOffset", "numbers_offset") as
        | number
        | null
        | undefined;
    const numbersOperator = readAliasedOption(parsed, "numbersOperator", "numbers_operator") as
        | NumberObfuscationOperatorFamily
        | null
        | undefined;
    const booleansEnabled = readAliasedOption(parsed, "booleansEnabled", "booleans_enabled") as
        | boolean
        | undefined;
    const booleansMethod = readAliasedOption(parsed, "booleansMethod", "booleans_method") as
        | BooleanObfuscationMethod
        | undefined;
    const booleansNumber = readAliasedOption(parsed, "booleansNumber", "booleans_number") as
        | number
        | null
        | undefined;
    const booleanDepth = readAliasedOption(parsed, "booleanDepth", "boolean_depth") as
        | number
        | "randomized"
        | undefined;
    const randomizedUniqueIdentifiers = readAliasedOption(
        parsed,
        "randomizedUniqueIdentifiers",
        "randomized_unique_identifiers"
    ) as boolean | undefined;
    const deadCodeInjection = readAliasedOption(
        parsed,
        "deadCodeInjection",
        "dead_code_injection"
    ) as boolean | undefined;
    const controlFlowFlattening = readAliasedOption(
        parsed,
        "controlFlowFlattening",
        "control_flow_flattening"
    ) as boolean | undefined;
    const simplify = readAliasedOption(parsed, "simplify", "simplify") as boolean | undefined;
    const unnecessaryDepth = readAliasedOption(parsed, "unnecessaryDepth", "unnecessary_depth") as
        | boolean
        | undefined;
    const evalify = readAliasedOption(parsed, "evalify", "evalify") as boolean | undefined;
    const nodeVm = readAliasedOption(parsed, "nodeVm", "node_vm") as boolean | undefined;
    const publicKey = readAliasedOption(parsed, "publicKey", "public_key") as string | undefined;
    const privateKey = readAliasedOption(parsed, "privateKey", "private_key") as string | undefined;
    const logLevel = readAliasedOption(parsed, "logLevel", "log_level") as LogLevel | undefined;
    let configOverrides: ObfuscationConfigInput = {};

    if (stringsEnabled !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            obfuscate: {
                strings: {
                    enabled: stringsEnabled,
                },
            },
        });
    }

    if (stringsEncode !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            obfuscate: {
                strings: {
                    encode: stringsEncode,
                },
            },
        });
    }

    if (stringsUes !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            obfuscate: {
                strings: {
                    unicode_escape_sequence: stringsUes,
                },
            },
        });
    }

    if (stringsMethod !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            obfuscate: {
                strings: {
                    method: stringsMethod,
                },
            },
        });
    }

    if (stringsSplitLength !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            obfuscate: {
                strings: {
                    split_length: stringsSplitLength,
                },
            },
        });
    }

    if (numbersEnabled !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            obfuscate: {
                numbers: {
                    enabled: numbersEnabled,
                },
            },
        });
    }

    if (numberMethod !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            obfuscate: {
                numbers: {
                    method: numberMethod,
                },
            },
        });
    }

    if (numbersOffset !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            obfuscate: {
                numbers: {
                    offset: numbersOffset,
                },
            },
        });
    }

    if (numbersOperator !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            obfuscate: {
                numbers: {
                    operator: numbersOperator,
                },
            },
        });
    }

    if (booleansEnabled !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            obfuscate: {
                booleans: {
                    enabled: booleansEnabled,
                },
            },
        });
    }

    if (booleansMethod !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            obfuscate: {
                booleans: {
                    method: booleansMethod,
                },
            },
        });
    }

    if (booleansNumber !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            obfuscate: {
                booleans: {
                    number: booleansNumber,
                },
            },
        });
    }

    if (booleanDepth !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            obfuscate: {
                booleans: {
                    depth: booleanDepth,
                },
            },
        });
    }

    if (randomizedUniqueIdentifiers !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            features: {
                randomized_unique_identifiers: randomizedUniqueIdentifiers,
            },
        });
    }

    if (parsed.minify !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            minify: parsed.minify,
        });
    }

    if (parsed.functionify !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            features: {
                functionify: parsed.functionify,
            },
        });
    }

    if (evalify !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            features: {
                evalify,
            },
        });
    }

    if (nodeVm !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            features: {
                node_vm: nodeVm,
            },
        });
    }

    if (publicKey !== undefined || privateKey !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            features: {
                encryption: {
                    public_key: publicKey,
                    private_key: privateKey,
                },
            },
        });
    }

    if (deadCodeInjection !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            features: {
                dead_code_injection: deadCodeInjection,
            },
        });
    }

    if (controlFlowFlattening !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            features: {
                control_flow_flattening: controlFlowFlattening,
            },
        });
    }

    if (simplify !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            features: {
                simplify,
            },
        });
    }

    if (unnecessaryDepth !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            features: {
                unnecessary_depth: unnecessaryDepth,
            },
        });
    }

    if (logLevel !== undefined) {
        configOverrides = mergeConfig(configOverrides, {
            log_level: logLevel,
        });
    }

    return configOverrides;
}

function readAliasedOption(
    parsed: CommanderCliOptions,
    camelCaseKey: keyof CommanderCliOptions,
    snakeCaseKey: string
): unknown {
    const parsedRecord = parsed as unknown as Record<string, unknown>;
    const camelCaseValue = parsedRecord[camelCaseKey as string];

    if (camelCaseValue !== undefined) {
        return camelCaseValue;
    }

    return parsedRecord[snakeCaseKey];
}

function parseBoolean(value: string, flag: string): boolean {
    if (value === "true") {
        return true;
    }

    if (value === "false") {
        return false;
    }

    throw new InvalidArgumentError(`${flag} must be true or false`);
}

function parseNumberOrRandomized(value: string, flag: string): number | null {
    if (value === "randomized") {
        return null;
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
        throw new InvalidArgumentError(`${flag} must be a finite number or randomized`);
    }

    return parsed;
}

function parsePositiveInteger(value: string, flag: string): number {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new InvalidArgumentError(`${flag} must be a positive integer`);
    }

    return parsed;
}

function parsePositiveIntegerOrRandomized(value: string, flag: string): number | "randomized" {
    if (value === "randomized") {
        return value;
    }

    return parsePositiveInteger(value, flag);
}

function parseNumberOperatorFamily(
    value: string,
    flag: string
): NumberObfuscationOperatorFamily | null {
    if (value === "randomized") {
        return null;
    }

    if (value === "+-" || value === "*/") {
        return value;
    }

    throw new InvalidArgumentError(`${flag} must be "+-", "*/", or randomized`);
}

function parseNumberMethod(value: string, flag: string): NumberObfuscationMethod {
    if (value === "offset" || value === "equation") {
        return value;
    }

    throw new InvalidArgumentError(`${flag} must be offset or equation`);
}

function parseBooleanMethod(value: string, flag: string): BooleanObfuscationMethod {
    if (value === "number" || value === "depth") {
        return value;
    }

    throw new InvalidArgumentError(`${flag} must be number or depth`);
}

function parseStringMethod(value: string, flag: string): StringObfuscationMethod {
    if (value === "array" || value === "split") {
        return value;
    }

    throw new InvalidArgumentError(`${flag} must be array or split`);
}

function parseLogLevel(value: string, flag: string): LogLevel {
    if (value === "none" || value === "error" || value === "info" || value === "debug") {
        return value;
    }

    throw new InvalidArgumentError(`${flag} must be one of none, error, info, or debug`);
}

interface CommanderCliOptions {
    input: string;
    output: string;
    config?: string;
    stringsEnabled?: boolean;
    stringsEncode?: boolean;
    stringsUes?: boolean;
    stringsMethod?: StringObfuscationMethod;
    stringsSplitLength?: number;
    numbersEnabled?: boolean;
    numbersMethod?: NumberObfuscationMethod;
    numbersOffset?: number | null;
    numbersOperator?: NumberObfuscationOperatorFamily | null;
    booleansEnabled?: boolean;
    booleansMethod?: BooleanObfuscationMethod;
    booleansNumber?: number | null;
    booleanDepth?: number | "randomized";
    randomizedUniqueIdentifiers?: boolean;
    minify?: boolean;
    functionify?: boolean;
    evalify?: boolean;
    nodeVm?: boolean;
    publicKey?: string;
    privateKey?: string;
    deadCodeInjection?: boolean;
    controlFlowFlattening?: boolean;
    simplify?: boolean;
    unnecessaryDepth?: boolean;
    logLevel?: LogLevel;
}
