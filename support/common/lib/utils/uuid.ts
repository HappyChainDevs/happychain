export type UUID = ReturnType<typeof crypto.randomUUID> & { _brand: "uuid" }

export function createUUID(): UUID {
    return crypto.randomUUID() as UUID
}
