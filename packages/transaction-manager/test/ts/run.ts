import {
    type LatestBlock,
    type Transaction,
    TransactionManager,
    type TransactionManagerConfig,
    TransactionStatus,
    TxmHookType,
} from "../../lib/index"
import {abis} from "../contracts/abi/Counter.ts"
import type { Abi } from "viem"
import { sleep } from "../../../common/lib/utils/sleep"
import { TestService } from "./utils/TestService"

const testConfig: TransactionManagerConfig = {
    rpc: {
        url: "http://localhost:8545",
    },
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // anvil account 1
    chainId: 31337,
    abis: abis
}

async function run() {
    const transactionManager = new TransactionManager(testConfig)
    const testService = new TestService(transactionManager)
    await testService.start()
    // await sleep(2000)
}
await run()