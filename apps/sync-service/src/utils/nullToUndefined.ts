export function nullToUndefined<T extends Record<string, unknown>>(value: T): T {
    return Object.fromEntries(
        Object.entries(value).map(([key, value]) => [key, value === null ? undefined : value])
    ) as T
}