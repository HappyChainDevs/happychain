export const env = (variable: string) => {
    if (process.env[variable]) return process.env[variable]!
    throw new Error(`Environment variable ${variable} is not defined`)
}

export const envHex = (variable: string): `0x${string}` => {
    const value = env(variable)
    if (!value.startsWith("0x")) throw new Error(`Environment variable ${variable} must start with 0x`)
    return value as `0x${string}`
}

export const envInt = (variable: string) => {
    const value = env(variable)
    const parsed = Number.parseInt(value)
    if (Number.isNaN(parsed)) throw new Error(`Environment variable ${variable} is not an integer`)
    return parsed
}

export const envBigInt = (variable: string) => {
    const value = env(variable)
    try {
        return BigInt(value)
    } catch {
        throw new Error(`Environment variable ${variable} is not an integer`)
    }
}
