import { http, type Address, createPublicClient, decodeFunctionResult, encodeFunctionData } from "viem"
import { localhost } from "viem/chains"
import { happyChainTestnetChain } from "../../../../common/lib"
import { abis } from "../../contracts/abi/Counter.ts"

function getPublicClient(chainId: number) {
    switch (chainId) {
        case 31337:
            return createPublicClient({
                chain: localhost,
                transport: http("http://127.0.0.1:8545"),
            })
        case 216:
            return createPublicClient({
                chain: happyChainTestnetChain,
                transport: http("https://happy-testnet-sepolia.rpc.caldera.xyz/http"),
            })
        default:
            throw new Error(`Unsupported chainId: ${chainId}`)
    }
}

export async function getNumber(COUNTER_ADDRESS: Address, chainId = 31337): Promise<bigint> {
    const client = getPublicClient(chainId)
    const result = await client.call({
        to: COUNTER_ADDRESS,
        data: encodeFunctionData({
            abi: abis.Counter,
            functionName: "number",
        }),
    })

    if (!result || !result.data) {
        throw new Error("Failed to get the number from the contract")
    }

    const decodeResult = decodeFunctionResult({
        abi: abis.Counter,
        functionName: "number",
        data: result!.data,
    })

    return decodeResult as bigint
}
