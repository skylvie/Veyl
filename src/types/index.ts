export type {
    LogLevel,
    NumberObfuscationOperator,
    ObfuscationConfig,
    ObfuscationConfigInput,
} from "./config.js";

export type {
    BundleResult,
    ObfuscateCodeResult,
    ObfuscateFileOptions,
    ObfuscationStats,
} from "./core.js";

export type {
    BabelNode,
    BabelNodePath,
    BabelScope,
    GenerateFn,
    PropKeyNode,
    TraverseFn,
} from "./babel.js";

export type {
    CliOptionDefinition,
    CliOptions,
    LoadedConfig,
} from "./cli.js";

export type {
    CliLogger,
} from "./logger.js";

export type {
    RuntimeHelperOptions,
} from "./runtime.js";

export type {
    CallablePath,
    ClassDeclarationPath,
    IdentifierNode,
    LiteralObfuscationResult,
    MemberExpressionNode,
    MemberExpressionPath,
    NewExpressionNode,
    PropertyPath,
    PropertyRenameResult,
    StatementPath,
    UnnecessaryDepthResult,
    VariableDeclaratorPath,
} from "./transforms.js";
