import pkg from "../../package.json"
import { findExports, getWorkerName } from "./utils"

export function clientCodeGen(code: string, id: string) {
    const workerName = getWorkerName(id)
    const exports = findExports(code)

    const stringId = JSON.stringify(id)
    const options = JSON.stringify({ type: "module", name: workerName })

    const defineFunc = (ex: ReturnType<typeof findExports>[number], idx: number) => {
        return `export const ${ex.name} = __client__.__defineFunction('__FUNC_${idx}__')`
    }

    // biome-ignore format: tidy
    return ""
        + `// ${pkg.name} starts\n`
        + 'import SharedWorker from "@okikio/sharedworker"\n'
        + `import { SharedWorkerClient } from "${pkg.name}/runtime"\n`
        + `const __worker__ = new SharedWorker(new URL(${stringId}, import.meta.url), ${options})\n`
        + "const __client__ = new SharedWorkerClient(__worker__)\n"
        + "export const dispatch = __client__.dispatch.bind(__client__)\n"
        + "export const addMessageListener = __client__.addMessageListener.bind(__client__)\n"
        + `// ${pkg.name} ends\n`
        + exports.map(defineFunc).join("\n")
}

export function workerCodeGen(code: string, id: string) {
    const workerName = getWorkerName(id)
    const exports = findExports(code)

    const stringWorkerName = JSON.stringify(workerName)

    // biome-ignore format: tidy
    return ""
        + `// ${pkg.name} starts\n`
        + `import { SharedWorkerServer } from '${pkg.name}/runtime'\n`
        + "const worker = new SharedWorkerServer(self, [\n"
        +       exports.map((ex) => `    ${ex.name}`).join(",\n")
        + `], ${stringWorkerName})\n`
        + `// ${pkg.name} ends\n`
        + code
}

export function shimCodeGen(code: string, _id: string) {
    // biome-ignore format: tidy
    return ""
        + "// ${pkg.name} starts\n"
        + `import { SharedWorkerShim } from '${pkg.name}/runtime'\n`
        + "const worker = new SharedWorkerShim()\n"
        + "export const addMessageListener = worker.addMessageListener.bind(worker)\n"
        + "// ${pkg.name} ends\n"
        + code
}
