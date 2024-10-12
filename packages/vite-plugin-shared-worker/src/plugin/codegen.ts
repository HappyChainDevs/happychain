import pkg from "../../package.json"
import { findExports, getWorkerName } from "./utils"

export function clientCodeGen(code: string, id: string) {
    const workerName = getWorkerName(id)
    const exports = findExports(code)

    const stringId = JSON.stringify(id)
    const options = JSON.stringify({ type: "module", name: workerName })

    // biome-ignore format: tidy
    return ""
        + `// ${pkg.name} starts\n`
        + 'import SharedWorker from "@okikio/sharedworker"\n'
        + `import { defineClientFactory } from "${pkg.name}/runtime"\n`
        + `const __worker__ = new SharedWorker(new URL(${stringId}, import.meta.url), ${options});\n`
        + "const __factory__ = defineClientFactory(__worker__)\n"
        + "const client = __factory__.defineClient()\n"
        + "export const dispatch = client.dispatch\n"
        + "export const addMessageListener = client.addMessageListener\n"
        + `// ${pkg.name} ends\n`
        + exports
            .map((ex) => `export const ${ex.name} = __factory__.defineFunction(${JSON.stringify(ex.name)})`)
            .join("\n")
}

export function workerCodeGen(code: string, id: string) {
    const workerName = getWorkerName(id)
    const exports = findExports(code)

    // biome-ignore format: tidy
    return ""
        + `// ${pkg.name} starts\n`
        + `import { defineSharedWorker } from '${pkg.name}/runtime'\n`
        + "const worker = defineSharedWorker(self, [\n"
        +       exports.map((ex) => `    ${ex.name}`).join(",\n")
        + `], ${JSON.stringify(workerName)})\n`
        + `// ${pkg.name} ends\n`
        + code
}
