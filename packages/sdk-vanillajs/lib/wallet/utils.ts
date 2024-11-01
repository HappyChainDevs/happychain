import { config } from "@happychain/sdk-shared"
import { blankIcon } from "../happyProvider/icons"

function filterUndefinedValues(obj: { [k: string]: string | undefined }): { [k: string]: string } {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v)) as { [k: string]: string }
}

export function makeIframeSource({ windowId, chain, rpcUrl }: { windowId: string; chain: string; rpcUrl: string }) {
    const urlBase = new URL("embed", config.iframePath)
    const searchParams = new URLSearchParams(
        filterUndefinedValues({ windowId: windowId, chain: chain, "rpc-urls": rpcUrl }),
    ).toString()
    return `${urlBase.href}?${searchParams}`
}

/**
 * Disable dragging 'ghost' by replacing with a blank image
 * onDragStart event, set this with
 * e.dataTransfer.setDragImage(img, 0, 0)
 */
export function makeBlankImage() {
    const img = new Image()
    img.src = blankIcon
    return img
}

export const isFirefox = navigator.userAgent.includes("Firefox")
