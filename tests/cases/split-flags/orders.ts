export function classifyOrder(total: number): string {
    const threshold = 20;
    const expensive = total >= threshold;

    return expensive ? `large-${total}` : `small-${total}`;
}

export function formatSummary(
    labels: string[],
    taxRate: number,
    auditEnabled: boolean
): string {
    return `${labels.join(",")}|${taxRate}|${auditEnabled}`;
}
