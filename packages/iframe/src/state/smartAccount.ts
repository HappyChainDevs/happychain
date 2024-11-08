import { accessorsFromAtom } from "@happychain/common"
import { type Atom, atom } from "jotai"
import { type EcdsaKernelSmartAccountImplementation, toEcdsaKernelSmartAccount } from "permissionless/accounts"
import { type SmartAccount, entryPoint07Address } from "viem/account-abstraction"
import { ACCOUNT_ABSTRACTION_CONTRACTS } from "#src/constants/accountAbstraction"
import { walletClientAtom } from "./walletClient"

/**
 * 
 * @todo remove this comment, it's just to have a breakdown of the flow somewhere while the feature is being implemented
 * 
 
  1. Web3Auth Service Worker
    Handles actual authentication
    Doesn't support direct permission requests
    Should never be accessed directly

   2. Requests Handler (/src/requests -> permissionless.ts, approved.ts
    Routes requests to Web3Auth when needed


   3. IframeProvider (/src/wagmi/provider)
    Acts as a middleware
    Intercepts and handles eth_requestAccounts
    Routes all requests through your permission system
 
 
(copy the following in mermaid.live for a flowchart view)
 
---
config:
  layout: fixed
---
flowchart TB
 subgraph subGraph0["User Interface"]
        UI["Iframe"]
        useSmartAccount["useSmartAccount() Hook"]
  end
 subgraph subGraph1["State Management (jotai)"]
        kernelAccountAtom["kernelAccountAtom"]
        walletClientAtom["walletClientAtom"]
  end
 subgraph subGraph2["Provider Layer"]
        IframeProvider["IframeProvider\n(wagmi/provider.ts)"]
        permissionless["mPermissionless Handler\n(requests/permissionless.ts)"]
        approved["Approved Handler\n(requests/approved.ts)"]
  end
 subgraph subGraph3["Web3Auth Layer"]
        ServiceWorker["Web3Auth Service Worker\n(web3auth.sw.ts)"]
        ethereumSigningProvider["EthereumSigningProvider"]
  end
 subgraph HappyChain["HappyChain"]
        RPC["RPC Endpoint"]
        AASmartContracts["EntryPoint Contract"]
  end
    UI --> useSmartAccount
    useSmartAccount --> kernelAccountAtom
    kernelAccountAtom --> walletClientAtom
    walletClientAtom --> IframeProvider
    IframeProvider --> permissionless & approved
    permissionless --> ServiceWorker
    approved --> ServiceWorker
    ServiceWorker --> ethereumSigningProvider
    ethereumSigningProvider --> RPC
    RPC --> Contracts["Contracts"]

 */

export type KernelSmartAccount = SmartAccount & EcdsaKernelSmartAccountImplementation<"0.7">

export const kernelAccountAtom: Atom<Promise<KernelSmartAccount | undefined>> = atom(async (get) => {
    const walletClient = get(walletClientAtom)

    if (!walletClient?.account) {
        console.debug("No wallet client or account available")
        return undefined
    }

    try {
        console.debug("Creating kernel account for address:", walletClient.account.address)

        const account = await toEcdsaKernelSmartAccount({
            client: walletClient,
            entryPoint: {
                address: entryPoint07Address,
                version: "0.7",
            },
            owners: [walletClient],
            version: "0.3.1",
            ecdsaValidatorAddress: ACCOUNT_ABSTRACTION_CONTRACTS.ECDSAValidator,
            accountLogicAddress: ACCOUNT_ABSTRACTION_CONTRACTS.Kernel,
            factoryAddress: ACCOUNT_ABSTRACTION_CONTRACTS.KernelFactory,
            metaFactoryAddress: ACCOUNT_ABSTRACTION_CONTRACTS.FactoryStaker,
        })

        const address = await account.getAddress()
        console.debug("Kernel account address:", address)
        return account
    } catch (error) {
        console.error("Error creating kernel account:", error)
    }
})

export const { getValue: getSmartAccount } = accessorsFromAtom(kernelAccountAtom)
