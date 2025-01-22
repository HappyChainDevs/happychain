import { type UUID, createUUID } from "@happy.tech/common"
import type { AppURL } from "#src/utils/appURL"

export const appURL = "http://localhost:1234" as AppURL
export const iframeURL = "http://localhost:4321" as AppURL

export const appURLMock = async () => ({
    getAppURL: () => appURL,
    getIframeURL: () => iframeURL,
    isApp: (app: AppURL) => app === appURL,
    isIframe: (app: AppURL) => app === iframeURL,
    isStandaloneIframe: () => false,
})

export const parentID = createUUID()
export const iframeID = createUUID()

export const requestUtilsMock = (importUtils: () => Promise<typeof import("#src/requests/utils")>) =>
    importUtils().then((utils) => ({
        ...utils,
        appForSourceID(sourceId: UUID): AppURL | undefined {
            if (sourceId === parentID) return appURL
            if (sourceId === iframeID) return iframeURL
            return undefined
        },
    }))
