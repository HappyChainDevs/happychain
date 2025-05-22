import { validate, version } from "uuid"

export type UUID = ReturnType<typeof crypto.randomUUID> & { _brand: "uuid" }

export function createUUID(): UUID {
    return crypto.randomUUID() as UUID
}

export function isUUID(str: string): str is UUID {
    return validate(str) && version(str) === 4
}
