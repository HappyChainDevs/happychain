import type { Abi } from "viem"
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
import { getNumber } from "./utils/getNumber"

const COUNTER_ADDRESS = "0xea7a81bacbac93afdc603902fe64ea3d361ba326" // Counter contract address deployed with create2 (wont change)

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

describe("TransactionManager", () => {
    const transactionManager = new TransactionManager(testConfig)

    it("starts and stops", async () => {
        await transactionManager.start()
        expect(transactionManager.chainId).toBe(31337)

        transactionManager.stop()
    })

    it("sends a transaction once", async () => {
        await transactionManager.start()

        const prevCounterVal = await getNumber(COUNTER_ADDRESS)

        const tx = transactionManager.createTransaction({
            address: COUNTER_ADDRESS,
            functionName: "increment",
            contractName: "Counter",
            args: [],
        })

        const demoOriginator = async (_block: LatestBlock) => {
            return [tx]
        }

        transactionManager.addTransactionOriginator(demoOriginator)

        const getTxResult = await transactionManager.getTransaction(tx.intentId)
        console.log(getTxResult)

        transactionManager.addHook(async (payload: { transaction: Transaction }) => {
            expect(payload.transaction.status).toBe(TransactionStatus.Success)
            const postCounterVal = await getNumber(COUNTER_ADDRESS)
            expect(postCounterVal as bigint).toBe((prevCounterVal as bigint) + 1n)
            transactionManager.stop()
        }, TxmHookType.TransactionStatusChanged)
    })
})
