import { buildImportedMessage, importedFlag, importedNumber, ImportedWorker, } from "./module.js";
const localSeed = 14;
const localLabel = "local-string";
const localEnabled = true;
const localDisabled = false;
const record = {
    secretValue: localSeed + importedNumber,
    label: localLabel,
    enabled: localEnabled,
    nested: {
        score: 3,
    },
};
class LocalWorker {
    prefix = "class-prefix";
    makeMessage(value) {
        const suffix = value > 10 ? "large" : "small";
        return `${this.prefix}:${suffix}:${record.secretValue}`;
    }
}
function summarize() {
    const importedWorker = new ImportedWorker("imported-class");
    const localWorker = new LocalWorker();
    const dynamicKey = "computed";
    const computedRecord = {
        [dynamicKey]: "computed-value",
    };
    return [
        buildImportedMessage("import-ok"),
        importedWorker.describe(6),
        localWorker.makeMessage(record.nested.score + 9),
        record.label,
        String(record.enabled === importedFlag),
        String(localDisabled),
        computedRecord[dynamicKey],
    ].join("|");
}
console.log(summarize());
