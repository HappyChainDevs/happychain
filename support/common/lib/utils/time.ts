const unit = {
    ms: 1,
    s: 1e3,
    m: 60e3,
    h: 3_600e3,
    d: 86_400e3,
} as const

export function formatMs(ms: number, long = false): string {
    const abs = Math.abs(ms)
    for (const [abbr, size] of Object.entries(unit).reverse()) {
        if (abs >= size) {
            const val = Math.round(ms / size)
            return long ? `${val} ${abbr}${Math.abs(val) !== 1 ? "s" : ""}` : `${val}${abbr}`
        }
    }
    return `${ms}ms`
}
