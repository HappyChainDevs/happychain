import { http, type Address, createPublicClient, decodeFunctionResult, encodeFunctionData } from "viem"
import { localhost } from "viem/chains"
import CounterAbi from "../../contracts/abi/Counter.json"

const client = createPublicClient({
    chain: localhost,
    transport: http("http://127.0.0.1:8545"),
})

export async function getNumber(COUNTER_ADDRESS: Address) {
    const result = await client.call({
        to: COUNTER_ADDRESS,
        data: encodeFunctionData({
            abi: CounterAbi,
            functionName: "number",
        }),
    })

    if (!result || !result.data) {
        throw new Error("Failed to get the number from the contract")
    }

    const decodeResult = decodeFunctionResult({
        abi: CounterAbi,
        functionName: "number",
        data: result!.data,
    })

    console.log("counter is now ", decodeResult)
    return decodeResult as bigint
}
