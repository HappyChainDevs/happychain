import type { Transaction } from "../../../lib/index"
import { COUNTER_ADDRESS } from "./constants"

export function createIncrementTransaction(testService): Transaction {
    return testService.txm.createTransaction({
        address: COUNTER_ADDRESS,
        functionName: "increment",
        contractName: "Counter",
        args: [],
    })
}
