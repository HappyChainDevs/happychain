import { config } from "../config"
import { blankIcon } from "../happyProvider/icons"

function filterUndefinedValues(obj: { [k: string]: string | undefined }): { [k: string]: string } {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v)) as { [k: string]: string }
}

type IframeSrcOptions = { windowId: string; chainId: string; rpcUrl: string }
export function makeIframeUrl({ windowId, chainId, rpcUrl }: IframeSrcOptions) {
    const urlBase = new URL("embed", config.iframePath)

    const searchParams = new URLSearchParams(
        filterUndefinedValues({ windowId: windowId, chainId: chainId, "rpc-urls": rpcUrl }),
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

/**
 * Feature Detection would be much better, however not possible in this case. The primary use here
 * is for the drag-and-drop API, which is baseline/'fully supported' on all modern browsers, however
 * the implementation for many (such as Firefox and Safari) is broken in reality.
 */
export const isFirefox = navigator.userAgent.includes("Firefox")
export const isChrome = navigator.userAgent.includes("Chrome")
