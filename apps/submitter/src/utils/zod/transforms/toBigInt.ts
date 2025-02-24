export const toBigInt = (n: string) => (n === "0x" ? BigInt(0) : BigInt(n))
