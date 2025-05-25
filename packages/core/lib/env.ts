import { isHttpString } from "@happy.tech/common"

export const IFRAME_PATH = (() => {
    const path = import.meta.env.HAPPY_IFRAME_URL
    if (!path) throw new Error("Env var HAPPY_IFRAME_URL is not specified.")
    if (!isHttpString(path)) throw new Error(`HAPPY_IFRAME_URL doesn't start with http[s]://: ${path}`)
    return path
})()
