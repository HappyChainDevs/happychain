import chalk from "chalk"
import { http, type Abi, createPublicClient, decodeFunctionResult, encodeFunctionData } from "viem"
import { localhost } from "viem/chains"
const { yellow } = chalk
import {
    type LatestBlock,
    type Transaction,
    TransactionManager,
    type TransactionManagerConfig,
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

async function getNumber() {
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

async function run() {
    const transactionManager = new TransactionManager(testConfig)
    console.log(yellow("starting transaction manager..."))
    await transactionManager.start()

    const prevCounterVal = await getNumber()
    console.log(yellow("counter value: ", prevCounterVal))

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

    transactionManager.addHook(async (payload: { transaction: Transaction }) => {
        console.log(yellow(`${payload.transaction.intentId} is ${payload.transaction.status}`))
        const postCounterVal = await getNumber()
        console.log(yellow("counter value: ", postCounterVal))
        await transactionManager.stop()
    }, TxmHookType.TransactionStatusChanged)
}
await run()
// console.log(yellow("restarting txm.."))
// await run()
