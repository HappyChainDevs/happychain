export function toBigInt(n: string) {
    return n === "0x" ? BigInt(0) : BigInt(n)
}
