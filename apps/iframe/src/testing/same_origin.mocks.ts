import { type UUID, createUUID } from "@happy.tech/common"
import type { AppURL } from "#src/utils/appURL"

export const appURL = "http://localhost:4321" as AppURL
export const walletID = createUUID()

export const appURLMock = async () => ({
    getAppURL: () => appURL,
    getWalletURL: () => appURL,
    walletID: () => walletID,
    isApp: (_app: AppURL) => true,
    isWallet: (_app: AppURL) => true,
    isStandaloneWallet: () => true,
    isEmbeddedWallet: () => false,
    appForSourceID(sourceId: UUID): AppURL | undefined {
        if (sourceId === walletID) return appURL
        return undefined
    },
})
