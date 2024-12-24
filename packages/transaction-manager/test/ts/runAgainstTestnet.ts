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
        url: "https://happy-testnet-sepolia.rpc.caldera.xyz/http",
    },
    privateKey: "0x49cbb0e24c219da3308ba392c639eded95cbb57cd544d18dfb46d01022388606", //address 0x95aF8bab1833719120e3D3e10B35eC6ed4a858bf
    chainId: 216,
    abis: abis
}


async function run() {
    
    const multiple = async (): Promise<Transaction[]> => {
        return [createIncrementTransaction()]
    }
    function createIncrementTransaction(): Transaction {
        return testService.txm.createTransaction({
            address: "0xea7a81bacbac93afdc603902fe64ea3d361ba326",
            functionName: "increment",
            contractName: "Counter",
            args: [],
        })
    }
    
    
    const transactionManager = new TransactionManager(testConfig)
    const testService = new TestService(transactionManager)
    testService.addTransactionOriginator(multiple)
    await testService.start()

    // await sleep(2000)
}
await run()