const isCITruthy = (ci: string | undefined): boolean => ci === "1" || ci?.toUpperCase() === "TRUE"

const isCI = (() => {
    if (typeof process !== "undefined" && typeof process.env === "object" && process.env.CI != null) {
        return isCITruthy(process.env.CI)
    }

    // Try to access import.meta.env safely in ESM + browser contexts
    try {
        // Note: some SSR tools throw just for *referencing* import.meta
        // So we wrap even that in a try block
        // This only works in environments that actually support import.meta
        // and won't throw just for reading it
        // @ts-ignore
        if (typeof import.meta !== "undefined" && typeof import.meta.env === "object") {
            // @ts-ignore
            return isCITruthy(import.meta.env.CI)
        }
    } catch {
        // Do nothing — likely running in CJS, SSR, or a CSP-restricted browser
    }

    return false
})()

const passthrough = (s: unknown): string => `${s}`

const reset = "\x1b[0m"

const _black = "\x1b[30m"
const _red = "\x1b[31m"
const _green = "\x1b[32m"
const _yellow = "\x1b[33m"
const _blue = "\x1b[34m"
const _magenta = "\x1b[35m"
const _cyan = "\x1b[36m"
const _white = "\x1b[37m"

export const black = isCI ? passthrough : (s: unknown) => `${_black}${s}${reset}`
export const red = isCI ? passthrough : (s: unknown) => `${_red}${s}${reset}`
export const green = isCI ? passthrough : (s: unknown) => `${_green}${s}${reset}`
export const yellow = isCI ? passthrough : (s: unknown) => `${_yellow}${s}${reset}`
export const blue = isCI ? passthrough : (s: unknown) => `${_blue}${s}${reset}`
export const magenta = isCI ? passthrough : (s: unknown) => `${_magenta}${s}${reset}`
export const cyan = isCI ? passthrough : (s: unknown) => `${_cyan}${s}${reset}`
export const white = isCI ? passthrough : (s: unknown) => `${_white}${s}${reset}`

export const colors = {
    black,
    magenta,
    red,
    green,
    yellow,
    blue,
    cyan,
    white,
}

export const noColors: typeof colors = {
    black: passthrough,
    magenta: passthrough,
    red: passthrough,
    green: passthrough,
    yellow: passthrough,
    blue: passthrough,
    cyan: passthrough,
    white: passthrough,
}
