import { type UUID, createUUID } from "@happy.tech/common"
import type { AppURL } from "#src/utils/appURL"

export const appURL = "http://localhost:1234" as AppURL
export const walletURL = "http://localhost:4321" as AppURL
export const parentID = createUUID()
export const walletID = createUUID()

export const appURLMock = async () => ({
    getAppURL: () => appURL,
    getWalletURL: () => walletURL,
    walletID: () => walletID,
    isApp: (app: AppURL) => app === appURL,
    isWallet: (app: AppURL) => app === walletURL,
    isStandaloneWallet: () => false,
    isEmbeddedWallet: () => true,
    appForSourceID(sourceID: UUID): AppURL | undefined {
        if (sourceID === parentID) return appURL
        if (sourceID === walletID) return walletURL
        return undefined
    },
})
