import { abis, deployment } from "@happy.tech/contracts/mocks/anvil"
import { createPublicClient, defineChain } from "viem"
import { http } from "viem"
import { afterAll, beforeAll, expect, test } from "vitest"
import { TxmHookType } from "../lib/HookManager"
import { TransactionStatus } from "../lib/Transaction"
import type { Transaction } from "../lib/Transaction"
import { TransactionManager } from "../lib/TransactionManager"
import { migrateToLatest } from "../lib/migrate"
import { ProxyBehavior, ProxyServer } from "./utils/ProxyServer"
import { TestGasEstimator } from "./utils/TestGasEstimator"
import { killAnvil, mineBlock } from "./utils/anvil"
import { startAnvil } from "./utils/anvil"
import { CHAIN_ID, PRIVATE_KEY, PROXY_URL } from "./utils/constants"
import { deployMockContracts } from "./utils/contracts"
import { cleanDB } from "./utils/db"

const txm = new TransactionManager({
    privateKey: PRIVATE_KEY,
    chainId: CHAIN_ID,
    rpc: {
        url: PROXY_URL,
        pollingInterval: 200,
    },
    abis: abis,
    gasEstimator: new TestGasEstimator(),
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
    await deployMockContracts()
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
        address: deployment.HappyCounter,
        functionName: "increment",
        contractName: "HappyCounter",
        args: [],
    })

    transactionQueue.push(transaction)

    await mineBlock(2)

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
        address: deployment.HappyCounter,
        functionName: "increment",
        contractName: "HappyCounter",
        args: [],
    })

    proxyServer.addBehavior(ProxyBehavior.Ignore)
    proxyServer.addBehavior(ProxyBehavior.Forward)

    transactionQueue.push(transaction)

    await mineBlock(2)

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

test("Transaction failed", async () => {
    const transaction = await txm.createTransaction({
        address: deployment.MockRevert,
        functionName: "revert",
        contractName: "MockRevert",
        args: [],
    })

    proxyServer.addBehavior(ProxyBehavior.Forward)

    transactionQueue.push(transaction)

    await mineBlock(2)

    const transactionReverted = await txm.getTransaction(transaction.intentId)

    if (!transactionReverted) {
        throw new Error("Transaction not found")
    }

    const revertReceipt = await directBlockchainClient.getTransactionReceipt({
        hash: transactionReverted.attempts[0].hash,
    })

    expect(transactionReverted.status).toBe(TransactionStatus.Failed)
    expect(transaction.attempts).length(1)
    expect(revertReceipt.status).toBe("reverted")
})

test("Transaction cancelled", async () => {
    const deadline = Math.round(Date.now()/1000 + 2)


    const transaction = await txm.createTransaction({
        address: deployment.HappyCounter,
        functionName: "increment",
        contractName: "HappyCounter",
        args: [],
        deadline
    })

    proxyServer.addBehavior(ProxyBehavior.Ignore)

    transactionQueue.push(transaction)

    await mineBlock()

    while(true) {
        const latestBlock = await directBlockchainClient.getBlock({
            blockTag: "latest"
        })

        if (latestBlock.timestamp > deadline) {
            break
        }

        proxyServer.addBehavior(ProxyBehavior.Ignore)
        await mineBlock()
    }

    proxyServer.addBehavior(ProxyBehavior.Forward)
    await mineBlock(2)

    const transactionCancelled = await txm.getTransaction(transaction.intentId)

    if (!transactionCancelled) {
        throw new Error("Transaction not found")
    }

    const latestAttempt = transactionCancelled.lastAttempt

    if (!latestAttempt) {
        throw new Error("No attempt found")
    }

    const receipt = await directBlockchainClient.getTransactionReceipt({
        hash: latestAttempt.hash,
    })

    const transactionExecuted = await directBlockchainClient.getTransaction({
        hash: latestAttempt.hash
    })

    expect(transactionCancelled.status).toBe(TransactionStatus.Cancelled)
    expect(receipt.status).toBe("success");
    expect(transactionExecuted.input).toBe("0x")
})