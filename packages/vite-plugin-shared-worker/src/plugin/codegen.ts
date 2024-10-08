import pkg from "../../package.json"
import { findExports, getWorkerName } from "./utils"

export function clientCodeGen(code: string, id: string) {
    const workerName = getWorkerName(id)
    const exports = findExports(code)

    return `// ${pkg.name} starts
import SharedWorker from "@okikio/sharedworker"
import { defineClientFactory } from "${pkg.name}/runtime"
const __worker__ = new SharedWorker(new URL(${JSON.stringify(id)}, import.meta.url), { type: 'module', name: ${JSON.stringify(workerName)} });
const __factory__ = defineClientFactory(__worker__)
const client = __factory__.defineClient()
export const dispatch = client.dispatch
export const addMessageListener = client.addMessageListener
// ${pkg.name} ends

${exports.map((ex) => `export const ${ex.name} = __factory__.defineFunction(${JSON.stringify(ex.name)})`).join("\n")}
`
}

export function workerCodeGen(code: string, id: string) {
    const workerName = getWorkerName(id)
    const exports = findExports(code)

    return `// ${pkg.name} starts
import { defineSharedWorker } from '${pkg.name}/runtime'
const worker = defineSharedWorker(self, [${exports.map((ex) => ex.name).join(", ")}], ${JSON.stringify(workerName)})
// ${pkg.name} ends

${code}
`
}
