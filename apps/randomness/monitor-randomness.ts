import { abis, deployment } from "@happy.tech/contracts/random/anvil"
import { http, type Block, type Hex, createPublicClient, encodeAbiParameters, encodePacked, keccak256 } from "viem"
import { anvil } from "viem/chains"
import { z } from "zod"

const RANDOMNESS_CONTRACT_ABI = abis.Random
const RANDOMNESS_CONTRACT_ADDRESS = deployment.Random
const DRAND_SERVICE_URL = "https://api.drand.sh/v2/beacons/evmnet"

const client = createPublicClient({
    chain: anvil,
    transport: http(),
})

const getDrandInfo = async () => {
    const drandInfoSchema = z.object({
        genesis_time: z.number().transform((value) => BigInt(value)),
        period: z.number().transform((value) => BigInt(value)),
    })

    const response = await fetch(DRAND_SERVICE_URL + "/info")

    if (!response.ok) {
        throw new Error("Failed to fetch drand info")
    }

    const data = await response.json()

    const genesisTime = data.genesis_time
    const period = data.period

    return drandInfoSchema.parse({
        genesis_time: genesisTime,
        period: period,
    })
}
const drandRoundSchema = z.object({
    round: z.number().transform((value) => BigInt(value)),
    signature: z
        .string()
        .transform((s) => s.toLowerCase())
        .refine((s) => s.length === 128, {
            message: "Signature must be 128 characters long",
        })
        .transform((s) => `0x${s}` as Hex)
        .refine((s) => /^0x[0-9a-f]+$/.test(s), {
            message: "Signature must contain only hexadecimal characters",
        }),
})

const getDrandRandomnessForRound = async (round: bigint) => {
    const response = await fetch(DRAND_SERVICE_URL + `/rounds/${round}`)
    const data = await response.json()
    const { signature } = drandRoundSchema.parse(data)

    const startSecondSliceIndex = signature.length - 64

    const signatureSlice1 = "0x" + signature.slice(2, startSecondSliceIndex)
    const signatureSlice2 = "0x" + signature.slice(startSecondSliceIndex)

    const signatureArray = [BigInt(signatureSlice1), BigInt(signatureSlice2)]

    return keccak256(encodeAbiParameters([{ name: "x", type: "uint256[2]" }], [[signatureArray[0], signatureArray[1]]]))
}

const drandTimestampToRound = (timestamp: bigint) => {
    return (timestamp - drandInfo.genesis_time) / drandInfo.period + 1n
}

const drandInfo = await getDrandInfo()
const drandDelay = await client.readContract({
    address: RANDOMNESS_CONTRACT_ADDRESS,
    abi: RANDOMNESS_CONTRACT_ABI,
    functionName: "DRAND_DELAY_SECONDS",
})

console.log("Drand delay", drandDelay)

client.watchBlocks({ onBlock: onNewBlock, pollingInterval: 500 })

async function onNewBlock(block: Block<bigint, false, "latest">) {
    const contractRandomValue = await client
        .readContract({
            address: RANDOMNESS_CONTRACT_ADDRESS,
            abi: RANDOMNESS_CONTRACT_ABI,
            functionName: "random",
        })
        .catch((error) => {
            console.error("Error reading random value", error)
        })

    if (!contractRandomValue) {
        return
    }

    console.log("Contract random value for block", block.number, contractRandomValue)

    const expectedDrandRound = drandTimestampToRound(block.timestamp - drandDelay)

    const drandRandomness = await getDrandRandomnessForRound(expectedDrandRound)

    const revealedValueForBlock = await client
        .readContract({
            address: RANDOMNESS_CONTRACT_ADDRESS,
            abi: RANDOMNESS_CONTRACT_ABI,
            functionName: "getRevealedValue",
            args: [block.number],
        })
        .catch((error) => {
            console.error("Error reading revealed value", error)
        })

    if (!revealedValueForBlock) {
        return
    }

    const expectedRandomValue = keccak256(
        encodePacked(["bytes32", "uint128"], [drandRandomness, revealedValueForBlock]),
    )

    if (contractRandomValue !== expectedRandomValue) {
        console.log("Random value mismatch for block", block.number)
        console.log("Expected random value", expectedRandomValue)
        console.log("Contract random value", contractRandomValue)
    }
}
