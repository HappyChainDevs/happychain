import { type Transaction, TransactionManager, type TransactionManagerConfig } from "../../lib/index"
import { abis } from "../contracts/abi/Counter.ts"
import { TestService } from "./utils/TestService"
import { COUNTER_ADDRESS } from "./utils/constants"
import { createIncrementTransaction } from "./utils/createIncrementTransaction"
import { getNumber } from "./utils/getNumber"

const CHAIN_ID = 216

const testConfig: TransactionManagerConfig = {
    rpc: {
        url: "wss://happy-testnet-sepolia.rpc.caldera.xyz/ws",
        retries: 0,
    },
    privateKey: "0x",
    chainId: CHAIN_ID,
    abis: abis,
    finalizedTransactionPurgeTime: 0,
}

async function run(key) {
    const single = async (): Promise<Transaction[]> => {
        return [createIncrementTransaction(testService)]
    }

    const { privateKey, ...configWithoutPrivateKey } = testConfig
    const transactionManager = new TransactionManager({ privateKey: key, ...configWithoutPrivateKey })
    const testService = new TestService(transactionManager)
    await testService.start()
    testService.addTransactionOriginator(single)

}
// await run("0x49cbb0e24c219da3308ba392c639eded95cbb57cd544d18dfb46d01022388606")

await run("0x1d70d33ba4fe1e0e09ababa465700eaf9c4f8f31be9aaa9aca1b35637e2e8451")
