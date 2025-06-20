import { blankIcon } from "@happy.tech/common"
import { IFRAME_PATH } from "../env"

function filterUndefinedValues(obj: { [k: string]: string | undefined }): { [k: string]: string } {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v)) as { [k: string]: string }
}

type IframeSrcOptions = { windowId: string; chainId: string }
export function makeIframeUrl({ windowId, chainId }: IframeSrcOptions) {
    const urlBase = new URL("embed", IFRAME_PATH)

    const searchParams = new URLSearchParams(filterUndefinedValues({ windowId: windowId, chainId: chainId })).toString()
    return `${urlBase.href}?${searchParams}`
}

/**
 * Disable dragging 'ghost' by replacing with a blank image
 * onDragStart event, set this with
 * e.dataTransfer.setDragImage(img, 0, 0)
 */
export function makeBlankImage() {
    if (typeof window === "undefined") return null
    const img = new Image()
    img.src = blankIcon
    return img
}

/**
 * Determines if the browser supports native drag and drop functionality.
 * Does not take into account browser quirks such as Firefox incorrectly reporting drop coordinates.
 */
export const browserFeatures = {
    dragAndDrop: typeof document !== "undefined" && "draggable" in document.createElement("div"),
}

/**
 * Feature Detection alone would be much better, however not possible in this case. The primary use here
 * is for the drag-and-drop API, which is baseline/'fully supported' on all modern browsers, however
 * the implementation for many (such as Firefox and Safari) is broken in reality.
 */
export const isFirefox = typeof navigator !== "undefined" && navigator.userAgent.includes("Firefox")
export const isChrome = typeof navigator !== "undefined" && navigator.userAgent.includes("Chrome")
