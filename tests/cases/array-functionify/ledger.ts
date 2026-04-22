export function buildLedger(multiplier: number): { ready: boolean; total: number } {
    const base = 6;

    return {
        ready: true,
        total: base * multiplier + 3,
    };
}

export function getStatusLabel(ready: boolean): string {
    return ready ? "ready" : "waiting";
}
