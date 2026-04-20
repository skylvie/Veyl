export const importedNumber = 28;
export const importedFlag = true;
const moduleSuffix = "module-string";
export function buildImportedMessage(input) {
    const localCount = 5;
    return `${input}:${moduleSuffix}:${localCount}`;
}
export class ImportedWorker {
    name;
    constructor(name) {
        this.name = name;
    }
    describe(multiplier) {
        const details = {
            title: this.name,
            active: true,
            count: multiplier * 7,
        };
        return `${details.title}:${details.active}:${details.count}`;
    }
}
