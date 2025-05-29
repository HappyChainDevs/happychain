import { HappyMethodNames } from "@happy.tech/common"
import { Permissions } from "./permissions"

export const requestLabels = {
    eth_requestAccounts: "Connect",
    eth_sendTransaction: "Send transaction",
    personal_sign: "Sign message",
    wallet_addEthereumChain: "Add chain",
    wallet_requestPermissions: "Grant permissions",
    wallet_switchEthereumChain: "Switch chain",
    wallet_watchAsset: "Watch token",
    wallet_sendCalls: "Batch calls",
    [HappyMethodNames.LOAD_ABI]: "Load ABI",
    [HappyMethodNames.REQUEST_SESSION_KEY]: "Approve session key",
} as const

export const permissionDescriptions = {
    [Permissions.Accounts]: "Connection: the app can see your information and suggest transactions.",
    [Permissions.SessionKey]: "Automatic approval: skip confirmation when this app interacts with approved contracts.",
}

export type PermissionDescriptionIndex = keyof typeof permissionDescriptions
