import { formatEther, numberToHex } from "viem"
import type { Address } from "viem"

import { publicClient } from "./clients"

function toHexDigits(number: bigint, size: number): string {
    return numberToHex(number, { size }).slice(2)
}

async function checkBalance(receiver: Address): Promise<string> {
    const balance = await publicClient.getBalance({
        address: receiver,
        blockTag: "latest",
    })

    return formatEther(balance)
}

export { toHexDigits, checkBalance }
