import { createJSONStorage } from "jotai/utils"

function MapReplacer(_key: string, value: unknown) {
    try {
        if (value instanceof Map) {
            return {
                dataType: "Map",
                value: Array.from(value.entries()),
            }
        }
    } catch {
        console.error("error in mapStorage replacer")
    }

    return value
}

function MapReviver(_key: string, value: unknown) {
    try {
        if (
            typeof value === "object" &&
            value !== null &&
            "dataType" in value &&
            "value" in value &&
            Array.isArray(value.value) &&
            value.dataType === "Map"
        ) {
            return new Map(value.value)
        }
    } catch {
        console.error("error in mapStorage reviver")
    }

    return value
}

export const createMapStorage = <T>() =>
    createJSONStorage<T>(() => localStorage, {
        replacer: MapReplacer,
        reviver: MapReviver,
    })
