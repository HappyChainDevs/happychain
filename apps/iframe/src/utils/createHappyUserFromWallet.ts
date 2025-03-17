import { type HappyUser, WalletType, shortenAddress } from "@happy.tech/wallet-common"
import { getKernelAccountAddress } from "#src/state/kernelAccount.ts"

export async function createHappyUserFromWallet(providerId: string, address: `0x${string}`): Promise<HappyUser> {
    const accountAddress = await getKernelAccountAddress(address)
    return {
        // connection type
        provider: providerId,
        type: WalletType.Injected,

        // social details
        avatar: `https://avatar.vercel.sh/${accountAddress}?size=120`,
        email: "",
        ens: "",
        name: shortenAddress(accountAddress),
        uid: address,

        // web3 details
        address: accountAddress,
        controllingAddress: address,
    }
}
