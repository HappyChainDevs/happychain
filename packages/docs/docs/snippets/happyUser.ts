interface HappyUser {
    address: `0x${string}`
    addresses: `0x${string}`[]
    avatar: string
    email: string
    ens: string
    name: string
    provider: string
    type: "social" | "injected"
    uid: string
}
