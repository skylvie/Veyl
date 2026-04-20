export const importedNumber = 28;
export const importedFlag = true;

const moduleSuffix = "module-string";

export function buildImportedMessage(input: string): string {
    const localCount = 5;

    return `${input}:${moduleSuffix}:${localCount}`;
}

export class ImportedWorker {
    private readonly name: string;

    constructor(name: string) {
        this.name = name;
    }

    describe(multiplier: number): string {
        const details = {
            title: this.name,
            active: true,
            count: multiplier * 7,
        };

        return `${details.title}:${details.active}:${details.count}`;
    }
}
