import { formatEther, numberToHex } from "viem"
import type { Address } from "viem"

import { abis as mockAbis, deployment as mockDeployment } from "../../deployments/anvil/mockTokens/abis.ts"
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

async function checkTokenBalance(address: Address): Promise<string> {
    const balance = await publicClient.readContract({
        address: mockDeployment.MockTokenA,
        abi: mockAbis.MockTokenA,
        functionName: "balanceOf",
        args: [address],
    })

    return formatEther(balance)
}

export { toHexDigits, checkBalance, checkTokenBalance }
