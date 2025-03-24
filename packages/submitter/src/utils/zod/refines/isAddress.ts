import { isAddress as viemIsAddress } from "viem"
import type { Address } from "#src/tmp/interface/common_chain"

export function isAddress(str: string): str is Address {
    return viemIsAddress(str)
}
