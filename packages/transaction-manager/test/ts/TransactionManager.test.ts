import type { Abi } from "viem"
import { describe, expect, it } from "vitest"
import { sleep } from "../../../common/lib/utils/sleep"
import {
    type Transaction,
    TransactionManager,
    type TransactionManagerConfig,
} from "../../lib/index"
import CounterAbi from "../contracts/abi/Counter.json"
import { TestService } from "./utils/TestService"
import { getNumber } from "./utils/getNumber"

const COUNTER_ADDRESS = "0xea7a81bacbac93afdc603902fe64ea3d361ba326"

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

describe("TransactionManager", async () => {
    const single = async (): Promise<Transaction[]> => {
        if ((await getNumber(COUNTER_ADDRESS)) === testService.counterVal) {
            return [createIncrementTransaction()]
        }
        return []
    }

    const multiple = async (): Promise<Transaction[]> => {
        return [createIncrementTransaction()]
    }

    const transactionManager = new TransactionManager(testConfig)
    const testService = new TestService(transactionManager)

    it("sends a transaction at least once", async () => {
        const counterValue1 = await getNumber(COUNTER_ADDRESS)

        // set single transaction originator
        testService.addTransactionOriginator(single)
        await testService.start()

        await sleep(10000)
        expect(await getNumber(COUNTER_ADDRESS)).toBeGreaterThanOrEqual(counterValue1 + 1n)
    })

    it("continuously sends transactions", async () => {
        const counterValue1 = await getNumber(COUNTER_ADDRESS)

        // set single transaction originator
        testService.addTransactionOriginator(multiple)
        await testService.start()

        await sleep(10000)
        expect(await getNumber(COUNTER_ADDRESS)).toBeGreaterThan(counterValue1 + 1n)
    })

    function createIncrementTransaction(): Transaction {
        return testService.txm.createTransaction({
            address: COUNTER_ADDRESS,
            functionName: "increment",
            contractName: "Counter",
            args: [],
        })
    }
})
