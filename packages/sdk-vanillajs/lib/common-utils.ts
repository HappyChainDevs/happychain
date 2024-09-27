// Don't import from here until tree shaking is fixed
// import { createUUID, type UUID } from "@happychain/common"

export type UUID = ReturnType<typeof crypto.randomUUID> & { _brand: "uuid" }

export function createUUID(): UUID {
    return crypto.randomUUID() as UUID
}
