export interface CreateAccountInput {
    owner: `0x${string}`
    salt: `0x${string}`
}

export interface CreateAccountOutput {
    owner: `0x${string}`
    salt: `0x${string}`
    address: `0x${string}`
}
