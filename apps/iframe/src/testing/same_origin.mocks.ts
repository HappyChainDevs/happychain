import { type UUID, createUUID } from "@happy.tech/common"
import type { AppURL } from "#src/utils/appURL"

export const appURL = "http://localhost:4321" as AppURL

export const appURLMock = async () => ({
    getAppURL: () => appURL,
    getIframeURL: () => appURL,
    isApp: (_app: AppURL) => true,
    isIframe: (_app: AppURL) => true,
    isStandaloneIframe: () => true,
})

export const iframeID = createUUID()

export const requestUtilsMock = (importUtils: () => Promise<typeof import("#src/requests/utils")>) =>
    importUtils().then((utils) => ({
        ...utils,
        appForSourceID(sourceId: UUID): AppURL | undefined {
            if (sourceId === iframeID) return appURL
            return undefined
        },
    }))
