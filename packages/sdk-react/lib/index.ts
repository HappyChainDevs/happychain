export { HappyWalletProvider, useHappyChain } from "./components/HappyWalletProvider"

let sdk: Promise<typeof import("@happychain/js")> | undefined = undefined

if (typeof window !== "undefined") {
    sdk = import("@happychain/js")
}

export const chains = sdk ? (await sdk).chains : { devnet: {}, testnet: {}, defaultChain: {} }
export const happyProvider = sdk ? (await sdk).happyProvider : undefined
export const onModalUpdate = sdk ? (await sdk).onModalUpdate : () => {}
export const onUserUpdate = sdk ? (await sdk).onUserUpdate : () => {}
export const getCurrentUser = sdk ? (await sdk).getCurrentUser : () => undefined
export const connect = sdk ? (await sdk).connect : () => Promise.resolve()
export const disconnect = sdk ? (await sdk).disconnect : () => Promise.resolve()

export type {
    HappyUser,
    EIP1193ChainDisconnectedError,
    EIP1193ChainNotRecognizedError,
    EIP1193DisconnectedError,
    EIP1193UnauthorizedError,
    EIP1193UnsupportedMethodError,
    EIP1193UserRejectedRequestError,
    GenericProviderRpcError,
} from "@happychain/js"
