import { HappyMethodNames } from "@happy.tech/common"

export const requestLabels = {
    eth_requestAccounts: "Permission request",
    eth_sendTransaction: "Send transaction",
    personal_sign: "Signature request",
    wallet_addEthereumChain: "Add network",
    wallet_requestPermissions: "Permission request",
    wallet_switchEthereumChain: "Switch network",
    wallet_watchAsset: "Watch asset",
    [HappyMethodNames.USE_ABI]: "Record ABI",
    [HappyMethodNames.REQUEST_SESSION_KEY]: "Approve session key",
} as const

export const permissionDescriptions = {
    eth_accounts: "Connection: the app can see your information and suggest transactions.",
}

export type PermissionDescriptionIndex = keyof typeof permissionDescriptions
