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
import { sleep } from "../../../common/lib/utils/sleep"
import { TestService } from "./utils/TestService"   

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
    const testService = new TestService(transactionManager)

    // it("starts and stops", async () => {
    //     await transactionManager.start()
    //     expect(transactionManager.chainId).toBe(31337)

    //     transactionManager.stop()
        
    // })

    // it("sends a transaction once", async () => {
    //     await transactionManager.start()

    //     const prevCounterVal = await getNumber(COUNTER_ADDRESS)

    //     const tx = transactionManager.createTransaction({
    //         address: COUNTER_ADDRESS,
    //         functionName: "increment",
    //         contractName: "Counter",
    //         args: [],
    //     })
    //     transactionManager.addTransactionOriginator(async (_block: LatestBlock) => {
    //         return [tx]
    //     })

    //     const getTxResult = await transactionManager.getTransaction(tx.intentId)
    //     console.log(getTxResult)

    //     await transactionManager.addHook(async (payload: { transaction: Transaction }) => {
    //         expect(payload.transaction.status).toBe(TransactionStatus.Success)
    //         const postCounterVal = await getNumber(COUNTER_ADDRESS)
    //         expect(postCounterVal as bigint).toBe((prevCounterVal as bigint) + 1n)
    //         console.log("shutting down transaction manager")
    //         transactionManager.stop()
    //     }, TxmHookType.TransactionStatusChanged)
    // })

    // it("sends two transactions in one block", async () => {
    //     await transactionManager.start()

    //     const prevCounterVal = await getNumber(COUNTER_ADDRESS)

    //     const tx = transactionManager.createTransaction({
    //         address: COUNTER_ADDRESS,
    //         functionName: "increment",
    //         contractName: "Counter",
    //         args: [],
    //     })

    //     const demoOriginator = async (_block: LatestBlock) => {
    //         return [tx]
    //     }

    //     transactionManager.addTransactionOriginator(demoOriginator)

    //     const getTxResult = await transactionManager.getTransaction(tx.intentId)
    //     console.log("getTxResult" ,getTxResult)

    //     transactionManager.addHook(async (payload: { transaction: Transaction }) => {
    //         expect(payload.transaction.status).toBe(TransactionStatus.Success)
    //         const postCounterVal = await getNumber(COUNTER_ADDRESS)
    //         expect(postCounterVal as bigint).toBe((prevCounterVal as bigint) + 1n)
            
    //         // get block number of transaction 

    //     }, TxmHookType.TransactionStatusChanged)
    // })

    it("sends a transaction once", async () => {
        await testService.start()
        await sleep(2000)
        
    })


    function createAndAddIncrementTransactionOriginator() {
        const tx = transactionManager.createTransaction({
            address: COUNTER_ADDRESS,
            functionName: "increment",
            contractName: "Counter",
            args: [],
        })
        transactionManager.addTransactionOriginator(async (_block: LatestBlock) => {
            return [tx]
        })
        return tx
    }
})


