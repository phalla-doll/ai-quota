export function formatCurrency(cents: number): string {
    return `$${(cents / 100).toFixed(2)}`
}

export function formatCompactNumber(n: number): string {
    return new Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
    }).format(n)
}

export function formatNumber(n: number): string {
    return new Intl.NumberFormat("en-US").format(n)
}

export function formatTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return String(n)
}

export function formatPercent(value: number, total: number): number {
    if (total <= 0) return 0
    return Math.min(100, Math.round((value / total) * 100))
}
