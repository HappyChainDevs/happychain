import yoctoSpinner from "yocto-spinner"

export const spinner = yoctoSpinner({ text: "" })

const ogLog = console.log.bind(console)
const ogWarn = console.warn.bind(console)
const ogError = console.error.bind(console)

const ogStart = spinner.start.bind(spinner)
const ogSuccess = spinner.success.bind(spinner)
const ogStop = spinner.stop.bind(spinner)

function spinnerOutputFunction(f: (...msgs) => void) {
    return (...msgs) => {
        spinner.clear()
        f(...msgs)
        spinner.start()
    }
}

let started = false

function installSpinnerOutputFunctions() {
    if (started) return
    console.log = spinnerOutputFunction(ogLog)
    console.warn = spinnerOutputFunction(ogWarn)
    console.error = spinnerOutputFunction(ogError)
    started = true
}

function uninstallSpinnerOutputFunctions() {
    console.log = ogLog
    console.warn = ogWarn
    console.error = ogError
    started = false
}

spinner.start = (text?: string) => {
    installSpinnerOutputFunctions()
    ogStart(text)
}

spinner.success = (text?: string) => {
    uninstallSpinnerOutputFunctions()
    ogSuccess(text)
}

spinner.stop = (text?: string) => {
    uninstallSpinnerOutputFunctions()
    ogStop(text)
}
