import { type Atom, atom } from "jotai"
import { type EcdsaKernelSmartAccountImplementation, toEcdsaKernelSmartAccount } from "permissionless/accounts"
import { type SmartAccount, entryPoint07Address } from "viem/account-abstraction"
import { ACCOUNT_ABSTRACTION_CONTRACTS } from "#src/constants/accountAbstraction"
import { walletClientAtom } from "./walletClient"

export type KernelSmartAccount = SmartAccount & EcdsaKernelSmartAccountImplementation<"0.7">
export const kernelAccountAtom: Atom<Promise<KernelSmartAccount | undefined>> = atom(async (get) => {
    const walletClient = get(walletClientAtom)
    if (!walletClient?.account) return undefined
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
    return account
})
