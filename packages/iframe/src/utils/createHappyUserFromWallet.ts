import type { HappyUser } from "@happychain/sdk-shared"

export function createHappyUserFromWallet(rdns: string, address: `0x${string}`): HappyUser {
    return {
        // connection type
        type: "injected",
        provider: rdns,
        // social details
        uid: address,
        email: "",
        name: `${address.slice(0, 6)}...${address.slice(-4)}`,
        ens: "",
        avatar: `https://avatar.vercel.sh/${address}?size=400`,
        // web3 details
        address: address,
        addresses: [address],
    }
}
