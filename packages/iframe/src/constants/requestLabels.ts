export const requestLabels = {
    eth_requestAccounts: "Permission Request",
    eth_sendTransaction: "Send Transaction",
    personal_sign: "Signature Request",
    wallet_addEthereumChain: "Add Network",
    wallet_requestPermissions: "Permission Request",
    wallet_switchEthereumChain: "Switch Network",
    wallet_watchAsset: "Watch Asset",
} as const

export const permissionDescriptions = {
    eth_accounts: "Connection: the app can see your information and suggest transactions.",
}

export type PermissionDescriptionIndex = keyof typeof permissionDescriptions
