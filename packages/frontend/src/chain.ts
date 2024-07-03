/**
 * This module exports values related to chain interop.
 *
 * @module chain
 */

import { connectorsForWallets } from "@rainbow-me/rainbowkit"
import { metaMaskWallet } from "@rainbow-me/rainbowkit/wallets"
import { rainbowkitBurnerWallet } from "burner-connector"
import { type Chain, Hex, http } from "viem"
import { createConfig } from "wagmi"
import { localhost } from "wagmi/chains"

// =================================================================================================

/** Unexported type for list of chains expected by Wagmi's `createConfig`. */
type Chains = readonly [Chain, ...Chain[]]

/** The list of chains supported by the app. */
export const chains: Chains = [localhost]

/** The application's name. */
export const appName = "My App"

// =================================================================================================
// Wagmi + ConnectKit Config

/** WalletConnect cloud project ID. */
export const walletConnectProjectId = "8934622f70e11b51de893ea309871a4c"

/** Wallets for use in RainbowKit. */
const wallets = [metaMaskWallet, rainbowkitBurnerWallet]

const connectors = connectorsForWallets(
    [
        {
            groupName: "Supported Wallets",
            wallets,
        },
    ],
    {
        appName,
        projectId: walletConnectProjectId,
    }
)

/** Wagmi's configuration, to be passed to the React WagmiConfig provider. */
export const wagmiConfig = createConfig({
    chains,
    connectors,
    ssr: false, // if your dApp uses server side rendering (SSR)
    transports: {
        [localhost.id]: http(),
    },
})

// =================================================================================================

/**
 * The test private keys ("test ... junk" mnemonic) used by tools like Anvil or Hardhat.
 */
export const testPrivateKeys: Hex[] = [
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
    "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
    "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
    "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
    "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
    "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
]

const burnerStorageKey = "burnerWallet.pk"

/**
 * Use the given private key as the burner wallet private key.
 *
 * Copied from https://github.com/scaffold-eth/burner-connector/blob/main/packages/burner-connector/src/utils/index.ts
 */
export const saveBurnerPK = (privateKey: Hex): void => {
    if (typeof window !== "undefined" && window != null) {
        window?.localStorage?.setItem(burnerStorageKey, privateKey)
    }
}

/**
 * Use one of the test private keys ("test ... junk" mnemonic) as the burner wallet private key.
 */
export function setBurnerTestPrivateKey(index: number) {
    saveBurnerPK(testPrivateKeys[index])
}

// =================================================================================================
