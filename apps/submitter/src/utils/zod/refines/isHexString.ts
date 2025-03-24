export function isHexString(str: string): str is `0x${string}` {
    if (!str.startsWith("0x")) return false

    // Special empty case
    if (str === "0x") return true

    try {
        return BigInt(str) >= 0n
    } catch {
        return false
    }
}
