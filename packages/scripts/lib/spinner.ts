import yoctoSpinner from "yocto-spinner"

const _spinner = yoctoSpinner({ text: "" })

const ogLog = console.log.bind(console)
const ogWarn = console.warn.bind(console)
const ogError = console.error.bind(console)
const ogTable = console.table.bind(console)

function spinnerOutputFunction(f: (typeof console)["log" | "warn" | "error" | "table"]) {
    return (...msgs: unknown[]) => {
        _spinner.clear()
        f(...msgs)
        _spinner.start()
    }
}

let started = false

function installSpinnerOutputFunctions() {
    if (started) return
    console.log = spinnerOutputFunction(ogLog)
    console.warn = spinnerOutputFunction(ogWarn)
    console.error = spinnerOutputFunction(ogError)
    console.table = spinnerOutputFunction(ogTable)
    started = true
}

function uninstallSpinnerOutputFunctions() {
    console.log = ogLog
    console.warn = ogWarn
    console.error = ogError
    console.table = ogTable
    started = false
}

export const spinner = {
    start(text?: string) {
        if (process.env.CI) {
            console.log(text)
        } else {
            installSpinnerOutputFunctions()
            _spinner.start(text)
        }
    },
    stop(text?: string) {
        if (process.env.CI) {
            console.log(text)
        } else {
            uninstallSpinnerOutputFunctions()
            _spinner.stop(text)
        }
    },
    success(text?: string) {
        if (process.env.CI) {
            console.log(text)
        } else {
            uninstallSpinnerOutputFunctions()
            _spinner.success(text)
        }
    },
    setText(text: string) {
        if (process.env.CI) {
            console.log(text)
        } else {
            _spinner.text = text
        }
    },
}
