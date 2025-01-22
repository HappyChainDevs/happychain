import pkg from "../../package.json" with { type: "json" }
import { findExports, getWorkerName } from "./utils.ts"

export function clientCodeGen(code: string, id: string) {
    const workerName = getWorkerName(id)
    const exports = findExports(code, id)

    const stringId = JSON.stringify(id)
    const options = JSON.stringify({ type: "module", name: workerName })

    /**
     * During minification for production builds the function names get mangled, making them
     * an unreliable source of truth here. Instead we are maintaining order and remapping them to
     * their relative index within the file, so that the names are generated correctly regardless
     * of minification
     */
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
    const exports = findExports(code, id)

    const stringWorkerName = JSON.stringify(workerName)

    // biome-ignore format: tidy
    return ""
        + `// ${pkg.name} starts\n`
        + `import { SharedWorkerServer } from '${pkg.name}/runtime'\n`
        + "globalThis.__worker__ = new SharedWorkerServer(self, [\n"
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
        + 'globalThis.__is_shim_worker__ = true\n'
        + "globalThis.__worker__ = new SharedWorkerShim()\n"
        + "// ${pkg.name} ends\n"
        + code
}
