import { type HappyUser, WalletType } from "@happychain/sdk-shared"

export function createHappyUserFromWallet(providerId: string, address: `0x${string}`): HappyUser {
    return {
        // connection type
        type: WalletType.Injected,
        provider: providerId,
        // social details
        uid: address,
        email: "",
        name: `${address.slice(0, 6)}...${address.slice(-4)}`,
        ens: "",
        avatar: `https://avatar.vercel.sh/${address}?size=400`,
        // web3 details
        controllingAddress: address,
        address,
    }
}
