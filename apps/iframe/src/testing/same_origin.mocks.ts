import { type UUID, createUUID } from "@happy.tech/common"
import type { AppURL } from "#src/utils/appURL"

export const appURL = "http://localhost:4321" as AppURL
export const iframeID = createUUID()

export const appURLMock = async () => ({
    getAppURL: () => appURL,
    getIframeURL: () => appURL,
    iframeID: () => iframeID,
    isApp: (_app: AppURL) => true,
    isIframe: (_app: AppURL) => true,
    isStandaloneIframe: () => true,
    appForSourceID(sourceId: UUID): AppURL | undefined {
        if (sourceId === iframeID) return appURL
        return undefined
    },
})
