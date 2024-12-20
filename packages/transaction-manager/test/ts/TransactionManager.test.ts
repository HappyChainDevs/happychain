import { http, type Abi, createPublicClient, decodeFunctionResult, encodeFunctionData } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { localhost } from "viem/chains"
import { describe, expect, it } from "vitest"
import {
    type LatestBlock,
    type Transaction,
    TransactionManager,
    type TransactionManagerConfig,
    TransactionStatus,
    TxmHookType,
} from "../../lib/index"
import CounterAbi from "../contracts/abi/Counter.json"

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

const client = createPublicClient({
    chain: localhost,
    transport: http("http://127.0.0.1:8545"),
})

// biome-ignore lint/suspicious/noExportsInTest: <explanation>
export async function getNumber() {
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

describe("TransactionManager", () => {
    const transactionManager = new TransactionManager(testConfig)

    it("starts", async () => {
        await transactionManager.start()
        expect(transactionManager.chainId).toBe(31337)
    })

    it("sends a transaction", async () => {
        const prevCounterVal = await getNumber()

        const tx = transactionManager.createTransaction({
            address: COUNTER_ADDRESS,
            functionName: "increment",
            contractName: "Counter",
            args: [],
        })
        console.log(tx)

        const demoOriginator = async (_block: LatestBlock) => {
            return [tx]
        }

        transactionManager.addTransactionOriginator(demoOriginator)

        const getTxResult = await transactionManager.getTransaction(tx.intentId)
        console.log(getTxResult)

        transactionManager.addHook(async (payload: { transaction: Transaction }) => {
            expect(payload.transaction.status).toBe(TransactionStatus.Success)
            const postCounterVal = await getNumber()
            expect(postCounterVal as bigint).toBe((prevCounterVal as bigint) + 1n)
        }, TxmHookType.TransactionStatusChanged)
    })

    it("sends multiple transactions", async () => {
        // print balance of the account
        console.log(
            await client.getBalance({
                address: privateKeyToAccount(testConfig.privateKey).address,
            }),
        )

        const prevCounterVal = await getNumber()

        const txs: Transaction[] = []
        for (let i = 0; i < 5; i++) {
            txs.push(
                transactionManager.createTransaction({
                    address: COUNTER_ADDRESS,
                    functionName: "increment",
                    contractName: "Counter",
                    args: [],
                }),
            )
        }

        const demoOriginator = async (_block: LatestBlock) => {
            return txs
        }

        transactionManager.addTransactionOriginator(demoOriginator)

        await transactionManager.addHook(async (payload: { transaction: Transaction }) => {
            expect(payload.transaction.status).toBe(TransactionStatus.Success)
            const postCounterVal = await getNumber()
            expect(postCounterVal as bigint).toBe((prevCounterVal as bigint) + 1n)
            // print balance of the account
            console.log(await client.getBalance({ address: privateKeyToAccount(testConfig.privateKey).address }))
        }, TxmHookType.TransactionStatusChanged)

        await transactionManager.addHook(async (payload: { block: LatestBlock }) => {
            console.log("new block", payload.block)
        }, TxmHookType.NewBlock)

        console.log(await getNumber())
    })
})
