import type { Address } from "@happy.tech/common"
import { type HappyUser, WalletType, shortenAddress } from "@happy.tech/wallet-common"
import { fetchBoopAccount } from "#src/state/boopAccount"

export async function createHappyUserFromWallet(providerId: string, address: Address): Promise<HappyUser> {
    const boopAccount = await fetchBoopAccount(address)
    return {
        // connection type
        provider: providerId,
        type: WalletType.Injected,

        // social details
        avatar: `https://avatar.vercel.sh/${boopAccount.address}?size=120`,
        email: "",
        ens: "",
        name: shortenAddress(boopAccount.address),
        uid: address,

        // web3 details
        address: boopAccount.address,
        controllingAddress: address,
    }
}
