import type { Boop } from "#lib/types/Boop"
import { zeroGasData } from "./computeBoopHash"

/**
 * Freezes the boop fields which are directly tied to the boops hash & verification signature.
 */
export function freezeBoopHashFields(boop: Boop) {
    const skip = new Set(Object.keys(zeroGasData))
    const isSelfPaying = boop.payer === boop.account
    for (const field of Object.keys(boop)) {
        if (!isSelfPaying && skip.has(field)) continue
        if (Object.prototype.hasOwnProperty.call(boop, field)) {
            Object.defineProperty(boop, field, {
                value: boop[field as keyof typeof boop],
                writable: false,
                configurable: false,
                enumerable: true,
            })
        } else {
            console.warn(`Property "${field}" does not exist on the object.`)
        }
    }
    Object.preventExtensions(boop)
    return boop
}
