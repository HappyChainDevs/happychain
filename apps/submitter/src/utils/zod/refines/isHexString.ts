export function isHexString(str: string): str is `0x${string}` {
    if (!str.startsWith("0x")) return false

    try {
        return BigInt(str) >= 0n
    } catch {
        return false
    }
}
