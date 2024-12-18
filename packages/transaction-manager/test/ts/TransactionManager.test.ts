import { http, type Abi, createPublicClient, decodeFunctionResult, encodeFunctionData } from "viem"
import { localhost } from "viem/chains"
import { describe, expect, it } from "vitest"
import { TransactionManager, type TransactionManagerConfig } from "../../lib/index"
import CounterAbi from "../contracts/abi/Counter.json"

describe("TransactionManager", () => {
    const COUNTER_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"

    const testConfig: TransactionManagerConfig = {
        rpc: {
            url: "http://localhost:8545",
        },
        privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // anvil account 1
        chainId: 31337,
        abis: {
            Counter: CounterAbi as Abi,
        },
    }

    const transactionManager = new TransactionManager(testConfig)

    it("starts", () => {
        transactionManager.start()
        expect(transactionManager.chainId).toBe(31337)
    })

    it("accepts a transaction", async () => {
        const prevCounterVal = await getNumber()

        const tx = transactionManager.createTransaction({
            address: COUNTER_ADDRESS,
            functionName: "increment",
            contractName: "Counter",
            args: [],
        })
        console.log(tx)

        const getTxResult = await transactionManager.getTransaction(tx.intentId)
        console.log(getTxResult) // undefined - already deleted?

        const postCounterVal = await getNumber()
        expect(postCounterVal as bigint).toBe((prevCounterVal as bigint) + 1n)
    })

    async function getNumber() {
        // construct viem client to query the Counter contract for the value
        const client = createPublicClient({
            chain: localhost,
            transport: http("http://127.0.0.1:8545"),
        })

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
})
