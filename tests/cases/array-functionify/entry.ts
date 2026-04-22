import { buildLedger, getStatusLabel } from "./ledger.js";
import { multiplier, workerLabel } from "./shared.js";

function main(): void {
    const ledger = buildLedger(multiplier);
    const headline = `${workerLabel}:${getStatusLabel(ledger.ready)}:${ledger.total}`;

    console.log(headline);
}

main();
