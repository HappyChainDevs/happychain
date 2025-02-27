import { abis, deployment } from "@happy.tech/contracts/mocks/anvil"
import { type Chain, createPublicClient } from "viem"
import { http } from "viem"
import { privateKeyToAddress } from "viem/accounts"
import { anvil as anvilViemChain } from "viem/chains"
import { afterAll, beforeAll, expect, test } from "vitest"
import { TxmHookType } from "../lib/HookManager"
import { AttemptType, TransactionStatus } from "../lib/Transaction"
import type { Transaction } from "../lib/Transaction"
import { TransactionManager } from "../lib/TransactionManager"
import { migrateToLatest } from "../lib/migrate"
import { ProxyBehavior, ProxyServer } from "./utils/ProxyServer"
import { TestGasEstimator } from "./utils/TestGasEstimator"
import { TestRetryManager } from "./utils/TestRetryManager"
import { killAnvil, mineBlock } from "./utils/anvil"
import { startAnvil } from "./utils/anvil"
import { CHAIN_ID, PRIVATE_KEY, PROXY_URL } from "./utils/constants"
import { deployMockContracts } from "./utils/contracts"
import { assertReceiptReverted, assertReceiptSuccess } from "./utils/customAsserts"
import { cleanDB, getPersistedTransaction } from "./utils/db"

const retryManager = new TestRetryManager()

const txm = new TransactionManager({
    privateKey: PRIVATE_KEY,
    chainId: CHAIN_ID,
    rpc: {
        url: PROXY_URL,
        pollingInterval: 200,
    },
    abis: abis,
    gasEstimator: new TestGasEstimator(),
    retryPolicyManager: retryManager,
})

const fromAddress = privateKeyToAddress(PRIVATE_KEY)

const proxyServer = new ProxyServer()

let transactionQueue: Transaction[] = []

txm.addTransactionOriginator(async () => {
    const transactions = transactionQueue
    transactionQueue = []
    return transactions
})

const chain: Chain = { ...anvilViemChain, id: CHAIN_ID, rpcUrls: { default: { http: [PROXY_URL] } } }

const directBlockchainClient = createPublicClient({
    chain: chain,
    transport: http(),
})

async function getCurrentCounterValue(): Promise<bigint> {
    return await directBlockchainClient.readContract({
        address: deployment.HappyCounter,
        functionName: "getCount",
        abi: abis.HappyCounter,
        account: fromAddress,
    })
}

async function getCurrentNonce(): Promise<number> {
    return await directBlockchainClient.getTransactionCount({
        address: fromAddress,
    })
}

async function createCounterTransaction(deadline?: number): Promise<Transaction> {
    return await txm.createTransaction({
        address: deployment.HappyCounter,
        functionName: "increment",
        contractName: "HappyCounter",
        args: [],
        deadline,
    })
}

let nonceBeforeEachTest: number

beforeAll(async () => {
    await cleanDB()
    await migrateToLatest()
    await startAnvil()
    await deployMockContracts()
    await proxyServer.start()
    await txm.start()
})

beforeEach(async () => {
    nonceBeforeEachTest = await getCurrentNonce()
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
    const previousCount = await getCurrentCounterValue()

    const transaction = await createCounterTransaction()

    transactionQueue.push(transaction)

    await mineBlock(2)

    const retrievedTransaction = await txm.getTransaction(transaction.intentId)

    if (!retrievedTransaction) {
        throw new Error("Transaction not found")
    }

    const receipt = await directBlockchainClient.getTransactionReceipt({
        hash: retrievedTransaction.attempts[0].hash,
    })

    const currentCount = await getCurrentCounterValue()

    const persistedTransaction = await getPersistedTransaction(transaction.intentId)

    const blockchainNonce = await getCurrentNonce()

    assertReceiptSuccess(deployment.HappyCounter, fromAddress, receipt)
    expect(retrievedTransaction?.status).toBe(TransactionStatus.Success)
    expect(currentCount).toBe(previousCount + 1n)
    expect(persistedTransaction).toBeDefined()
    expect(persistedTransaction?.status).toBe(TransactionStatus.Success)
    expect(retrievedTransaction?.lastAttempt?.nonce).toBe(nonceBeforeEachTest)
    expect(blockchainNonce).toBe(nonceBeforeEachTest + 1)
})

test("Transaction retried", async () => {
    const previousCount = await getCurrentCounterValue()

    const transaction = await createCounterTransaction()

    proxyServer.addBehavior(ProxyBehavior.NotAnswer)

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

    const currentCount = await getCurrentCounterValue()

    const persistedTransaction = await getPersistedTransaction(transaction.intentId)

    const blockchainNonce = await getCurrentNonce()

    assertReceiptSuccess(deployment.HappyCounter, fromAddress, successReceipt)
    expect(transactionSuccess.status).toBe(TransactionStatus.Success)
    expect(transaction.attempts.length).toBe(2)
    expect(currentCount).toBe(previousCount + 1n)
    expect(transactionSuccess.lastAttempt?.nonce).toBe(nonceBeforeEachTest)
    expect(persistedTransaction).toBeDefined()
    expect(persistedTransaction?.status).toBe(TransactionStatus.Success)
    expect(blockchainNonce).toBe(nonceBeforeEachTest + 1)
})

test("Transaction failed", async () => {
    const previousCount = await getCurrentCounterValue()

    const transaction = await txm.createTransaction({
        address: deployment.MockRevert,
        functionName: "intentionalRevert",
        contractName: "MockRevert",
        args: [],
    })

    transactionQueue.push(transaction)

    await mineBlock(2)

    const transactionReverted = await txm.getTransaction(transaction.intentId)

    if (!transactionReverted) {
        throw new Error("Transaction not found")
    }

    const revertReceipt = await directBlockchainClient.getTransactionReceipt({
        hash: transactionReverted.attempts[0].hash,
    })

    const currentCount = await getCurrentCounterValue()

    const persistedTransaction = await getPersistedTransaction(transaction.intentId)

    const blockchainNonce = await getCurrentNonce()

    expect(transactionReverted.status).toBe(TransactionStatus.Failed)
    expect(transaction.attempts).length(1)
    assertReceiptReverted(deployment.MockRevert, fromAddress, revertReceipt)
    expect(currentCount).toBe(previousCount)
    expect(transactionReverted.lastAttempt?.nonce).toBe(nonceBeforeEachTest)
    expect(persistedTransaction).toBeDefined()
    expect(persistedTransaction?.status).toBe(TransactionStatus.Failed)
    expect(blockchainNonce).toBe(nonceBeforeEachTest + 1)
})

test("Transaction failed for out of gas", async () => {
    const previousCount = await getCurrentCounterValue()

    const transaction = await txm.createTransaction({
        address: deployment.MockRevert,
        functionName: "intentionalRevertDueToGasLimit",
        contractName: "MockRevert",
        args: [],
    })

    transactionQueue.push(transaction)

    await mineBlock(2)

    const transactionReverted = await txm.getTransaction(transaction.intentId)

    if (!transactionReverted) {
        throw new Error("Transaction not found")
    }

    const revertReceipt = await directBlockchainClient.getTransactionReceipt({
        hash: transactionReverted.attempts[0].hash,
    })

    const currentCount = await getCurrentCounterValue()

    const persistedTransaction = await getPersistedTransaction(transaction.intentId)

    const blockchainNonce = await getCurrentNonce()

    expect(transactionReverted.status).toBe(TransactionStatus.Failed)
    expect(transaction.attempts).length(1)
    assertReceiptReverted(deployment.MockRevert, fromAddress, revertReceipt)
    expect(currentCount).toBe(previousCount)
    expect(transactionReverted.lastAttempt?.nonce).toBe(nonceBeforeEachTest)
    expect(retryManager.haveTriedToRetry(transaction.intentId)).toBeTruthy()
    expect(revertReceipt.gasUsed).toBe(transactionReverted.attempts[0].gas)
    expect(persistedTransaction).toBeDefined()
    expect(persistedTransaction?.status).toBe(TransactionStatus.Failed)
    expect(blockchainNonce).toBe(nonceBeforeEachTest + 1)
})

test("Transaction cancelled due to deadline passing", async () => {
    const previousCount = await getCurrentCounterValue()

    const deadline = Math.round(Date.now() / 1000 + 2)

    const transaction = await createCounterTransaction(deadline)

    proxyServer.addBehavior(ProxyBehavior.NotAnswer)

    transactionQueue.push(transaction)

    await mineBlock()

    while (true) {
        const latestBlock = await directBlockchainClient.getBlock({
            blockTag: "latest",
        })

        if (latestBlock.timestamp > deadline) {
            break
        }

        proxyServer.addBehavior(ProxyBehavior.NotAnswer)
        await mineBlock()
    }

    await mineBlock()

    const transactionCancelling = await txm.getTransaction(transaction.intentId)

    if (!transactionCancelling) {
        throw new Error("Transaction not found")
    }

    expect(transactionCancelling.status).toBe(TransactionStatus.Cancelling)

    await mineBlock()

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
        hash: latestAttempt.hash,
    })

    const currentCount = await getCurrentCounterValue()

    const persistedTransaction = await getPersistedTransaction(transaction.intentId)

    const blockchainNonce = await getCurrentNonce()

    expect(transactionCancelled.status).toBe(TransactionStatus.Cancelled)
    assertReceiptSuccess(fromAddress, fromAddress, receipt)
    expect(transactionExecuted.input).toBe("0x")
    expect(receipt.gasUsed).toBe(21000n)
    expect(latestAttempt.type).toBe(AttemptType.Cancellation)
    expect(currentCount).toBe(previousCount)
    expect(transactionCancelled.lastAttempt?.nonce).toBe(nonceBeforeEachTest)
    expect(persistedTransaction).toBeDefined()
    expect(persistedTransaction?.status).toBe(TransactionStatus.Cancelled)
    expect(blockchainNonce).toBe(nonceBeforeEachTest + 1)
})
