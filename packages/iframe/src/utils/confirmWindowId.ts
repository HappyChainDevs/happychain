const iframeUUID = new URLSearchParams(window.location.search).get("windowId")

export const confirmWindowId = (windowId: ReturnType<typeof crypto.randomUUID>) => windowId === iframeUUID
