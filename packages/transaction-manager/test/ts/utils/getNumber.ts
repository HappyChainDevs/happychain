import { http, type Abi, type Address, decodeFunctionResult, encodeFunctionData, createPublicClient } from "viem"
import CounterAbi from "../../contracts/abi/Counter.json"
import { localhost } from "viem/chains"

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

    return decodeFunctionResult({
        abi: CounterAbi,
        functionName: "number",
        data: result!.data,
    })
}
