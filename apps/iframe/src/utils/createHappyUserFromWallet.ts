import { type HappyUser, WalletType } from "@happy.tech/wallet-common"

export async function createHappyUserFromWallet(providerId: string, address: `0x${string}`): Promise<HappyUser> {
    return {
        // connection type
        provider: providerId,
        type: WalletType.Injected,

        // social details
        avatar: `https://avatar.vercel.sh/${address}?size=400`,
        email: "",
        ens: "",
        name: `${address.slice(0, 6)}...${address.slice(-4)}`,
        uid: address,

        // web3 details
        address: address,
        controllingAddress: address,
    }
}
