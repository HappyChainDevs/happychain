#!/usr/bin/env bun
/**
 * postProcessDocLinks.ts <file_path>
 * Usage: bun run scripts/utils/postProcessDocLinks.ts <file_path>
 */

// Hardcoded mappings for special types in EventsAndErrors.sol
const EVENTS_AND_ERRORS_MAPPINGS: Record<string, "event" | "error"> = {
    // Events
    BoopExecutionCompleted: "event",
    BoopSubmitted: "event",
    CallReverted: "event",
    ExecutionRejected: "event",
    ExecutionReverted: "event",
    Received: "event",
    // Errors
    GasPriceTooHigh: "error",
    InsufficientStake: "error",
    InvalidNonce: "error",
    ValidationReverted: "error",
    ValidationRejected: "error",
    PaymentValidationReverted: "error",
    PaymentValidationRejected: "error",
    PayoutFailed: "error",
    UnknownDuringSimulation: "error",
    NotFromEntryPoint: "error",
    InvalidSignature: "error",
    ExtensionAlreadyRegistered: "error",
    ExtensionNotRegistered: "error",
    InvalidExtensionValue: "error",
}

// Hardcoded mappings for special types in Types.sol
const TYPES_MAPPINGS: Record<string, "struct" | "enum"> = {
    // Structs
    Boop: "struct",
    EntryPointOutput: "struct",
    ExecutionOutput: "struct",
    CallInfo: "struct",
    // Enums
    CallStatus: "enum",
    Validity: "enum",
    ExtensionType: "enum",
}

function processLine(line: string): string {
    // Pattern to match {dir/File} or {dir/File.function}
    const pattern = /\{([a-zA-Z0-9_]+)\/([a-zA-Z0-9_]+)(?:\.([a-zA-Z0-9_]+))?\}/g
    return line.replace(pattern, (_match, dir, file, func) => {
        if (file === "EventsAndErrors") {
            if (func) {
                const typePrefix = EVENTS_AND_ERRORS_MAPPINGS[func] || "error"
                return `[${func}](/src/boop/${dir}/${file}.sol/${typePrefix}.${func}.html)`
            } else {
                return `[${file}](/src/boop/${dir}/${file}.sol)`
            }
        } else if (file === "Types") {
            if (func) {
                const typePrefix = TYPES_MAPPINGS[func] || "struct"
                return `[${func}](/src/boop/${dir}/${file}.sol/${typePrefix}.${func}.html)`
            } else {
                return `[${file}](/src/boop/${dir}/${file}.sol)`
            }
        } else {
            const typeName = file.startsWith("I") ? "interface" : "contract"
            if (func) {
                return `[${file}.${func}](/src/boop/${dir}/${file}.sol/${typeName}.${file}.html#${func.toLowerCase()})`
            } else {
                return `[${file}](/src/boop/${dir}/${file}.sol/${typeName}.${file}.html)`
            }
        }
    })
}

async function main() {
    if (process.argv.length !== 3) {
        console.error("Usage: bun run scripts/fix_doc_links.ts <file_path>")
        process.exit(1)
    }
    const filePath = process.argv[2]
    const bunFile = Bun.file(filePath)
    const content = await bunFile.text()
    const processed = content
        .split("\n")
        .map((line) => processLine(line))
        .join("\n")
    console.log(processed)
}

main()
