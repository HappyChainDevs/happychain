import { accessorsFromAtom } from "@happychain/common"
import { atom } from "jotai"
import type { EIP1193Provider } from "viem"

/**
 * Injected provider is the user selected EIP-6963 injected provider
 * to be used on the iframe side when needed.
 *
 * When connected to a dapp, the HappyProvider on the dapp side will maintain connection with the
 * injected wallet, however when accessing the iframe directly, this will be used instead.
 *
 * The reason we don't store this direction in the providerAtom is because in both of the above
 * cases the providerAtom will hold the same InjectedProviderProxy which will make decisions on if
 * the current request is supposed to be forwarded tot eh dapp to be executed, or executed on the
 * iframe side.
 */
export const injectedProviderAtom = atom<EIP1193Provider | undefined>()

export const { getValue: getInjectedProvider, setValue: setInjectedProvider } = accessorsFromAtom(injectedProviderAtom)
