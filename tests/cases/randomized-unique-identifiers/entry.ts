class Worker {
    prefix = "worker";

    format(value: number): string {
        const record = {
            score: value,
        };

        return `${this.prefix}:${record.score}`;
    }
}

const worker = new Worker();
console.log(worker.format(12));
