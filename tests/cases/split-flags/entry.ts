import { classifyOrder, formatSummary } from "./orders.js";
import { featureFlags, taxRate } from "./settings.js";

const totals = [12, 27, 42];
const labels = totals.map((value) => classifyOrder(value));
const summary = formatSummary(labels, taxRate, featureFlags.auditEnabled);

console.log(summary);
