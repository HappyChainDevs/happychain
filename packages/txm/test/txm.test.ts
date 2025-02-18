import { abis } from "@happy.tech/contracts/mocks/sepolia"
import { createPublicClient, defineChain } from "viem"
import { http } from "viem"
import { afterAll, beforeAll, expect, test } from "vitest"
import { TxmHookType } from "../lib/HookManager"
import { TransactionStatus } from "../lib/Transaction"
import type { Transaction } from "../lib/Transaction"
import { TransactionManager } from "../lib/TransactionManager"
import { migrateToLatest } from "../lib/migrate"
import { ProxyBehavior, ProxyServer } from "./utils/ProxyServer"
import { killAnvil, mineBlock } from "./utils/anvil"
import { startAnvil } from "./utils/anvil"
import { CHAIN_ID, PRIVATE_KEY, PROXY_URL } from "./utils/constants"
import { cleanDB } from "./utils/db"

const txm = new TransactionManager({
    privateKey: PRIVATE_KEY,
    chainId: CHAIN_ID,
    rpc: {
        url: PROXY_URL,
        pollingInterval: 200,
    },
    abis: abis,
})

const proxyServer = new ProxyServer()

let transactionQueue: Transaction[] = []

txm.addTransactionOriginator(async () => {
    const transactions = transactionQueue
    transactionQueue = []
    return transactions
})

const chain = defineChain({
    id: CHAIN_ID,
    name: "Unknown",
    rpcUrls: {
        default: {
            http: [PROXY_URL],
        },
    },
    nativeCurrency: {
        name: "Unknown",
        symbol: "UNKNOWN",
        decimals: 18,
    },
})

const directBlockchainClient = createPublicClient({
    chain: chain,
    transport: http(),
})

beforeAll(async () => {
    await cleanDB()
    await migrateToLatest()
    await startAnvil()
    await proxyServer.start()
    await txm.start()
})

afterAll(() => {
    killAnvil()
})

test("Setup is correct", async () => {
    let blockMined = false
    txm.addHook(TxmHookType.NewBlock, () => {
        blockMined = true
    })

    await mineBlock()

    expect(blockMined).toBe(true)
})

test("Simple transaction executed", async () => {
    const transaction = await txm.createTransaction({
        address: "0x0000000000000000000000000000000000000000",
        functionName: "increment",
        contractName: "HappyCounter",
        args: [],
    })

    transactionQueue.push(transaction)

    await mineBlock()

    await mineBlock()

    const retrievedTransaction = await txm.getTransaction(transaction.intentId)

    if (!retrievedTransaction) {
        throw new Error("Transaction not found")
    }

    const receipt = await directBlockchainClient.getTransactionReceipt({
        hash: retrievedTransaction.attempts[0].hash,
    })

    expect(receipt).toBeDefined()
    expect(receipt?.status).toBe("success")
    expect(retrievedTransaction?.status).toBe(TransactionStatus.Success)
})

test("Transaction retried", async () => {
    const transaction = await txm.createTransaction({
        address: "0x0000000000000000000000000000000000000000",
        functionName: "increment",
        contractName: "HappyCounter",
        args: [],
    })

    proxyServer.addBehavior(ProxyBehavior.Ignore)
    proxyServer.addBehavior(ProxyBehavior.Forward)

    transactionQueue.push(transaction)

    await mineBlock()

    await mineBlock()

    const transactionPending = await txm.getTransaction(transaction.intentId)

    if (!transactionPending) {
        throw new Error("Transaction not found")
    }

    const latestAttemptPending = transactionPending.lastAttempt

    if (!latestAttemptPending) {
        throw new Error("Latest attempt not found")
    }

    await expect(
        directBlockchainClient.getTransactionReceipt({
            hash: latestAttemptPending.hash,
        }),
    ).rejects.toThrow()

    expect(transactionPending.status).toBe(TransactionStatus.Pending)

    await mineBlock()

    const transactionSuccess = await txm.getTransaction(transaction.intentId)

    if (!transactionSuccess) {
        throw new Error("Transaction not found")
    }

    const successReceipt = await directBlockchainClient.getTransactionReceipt({
        hash: transactionSuccess.attempts[1].hash,
    })

    expect(successReceipt?.status).toBe("success")
    expect(transactionSuccess.status).toBe(TransactionStatus.Success)
    expect(transaction.attempts.length).toBe(2)
})
