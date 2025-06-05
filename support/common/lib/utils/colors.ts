const isCI =
    globalThis.process?.env?.CI === "true" ||
    globalThis.process?.env?.CI === "1" ||
    import.meta?.env?.CI === "true" ||
    import.meta?.env?.CI === "1"

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
