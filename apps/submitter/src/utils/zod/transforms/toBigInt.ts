export function toBigInt(n: string) {
    return !n || n === "0x" ? BigInt(0) : BigInt(n)
}
