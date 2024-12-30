import { type Transaction, TransactionManager, type TransactionManagerConfig } from "../../lib/index"
import { abis } from "../contracts/abi/Counter.ts"
import { getNumber } from "./utils/getNumber"
import { TestService } from "./utils/TestService"

const COUNTER_ADDRESS = "0xea7a81bacbac93afdc603902fe64ea3d361ba326"
const CHAIN_ID = 216

const testConfig: TransactionManagerConfig = {
    rpc: {
        url: "https://happy-testnet-sepolia.rpc.caldera.xyz/http",
    },
    privateKey: "0x",
    chainId: CHAIN_ID,
    abis: abis,
}



async function run(key) {
    const multiple = async (): Promise<Transaction[]> => {
        return [createIncrementTransaction()]
    }
    const single = async (): Promise<Transaction[]> => {
        if ((await getNumber(COUNTER_ADDRESS, CHAIN_ID)) === testService.counterVal) {
            return [createIncrementTransaction()]
        }
        return []
    }

    function createIncrementTransaction(): Transaction {
        return testService.txm.createTransaction({
            address: COUNTER_ADDRESS,
            functionName: "increment",
            contractName: "Counter",
            args: [],
        })
    }

    const { privateKey, ...configWithoutPrivateKey } = testConfig
    const transactionManager = new TransactionManager({ privateKey: key, ...configWithoutPrivateKey })
    const testService = new TestService(transactionManager)
    testService.addTransactionOriginator(single)
    await testService.start()
}
// await run("0x49cbb0e24c219da3308ba392c639eded95cbb57cd544d18dfb46d01022388606")

await run("0x1d70d33ba4fe1e0e09ababa465700eaf9c4f8f31be9aaa9aca1b35637e2e8451")
