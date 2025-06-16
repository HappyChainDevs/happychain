import { type Address, shortenAddress } from "@happy.tech/common"
import { type HappyUser, WalletType } from "@happy.tech/wallet-common"
import { getBoopAccountAddress } from "#src/connections/boopAccount"

export async function createHappyUserFromWallet(providerId: string, address: Address): Promise<HappyUser> {
    const accountAddress = await getBoopAccountAddress(address)
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
