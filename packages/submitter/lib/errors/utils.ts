import { getProp, stringify } from "@happy.tech/common"

/**
 * Attempts to extract a string description from the error, falling back to undefined if failing.
 */
export function extractErrorMessage(error: unknown): string | undefined {
    // biome-ignore format: beauty
    return stringify(getProp(error, "message")
        ?? stringify(getProp(error, "shortMessage"))
        ?? stringify(getProp(error, "details")))
        ?? stringify(error)
}
