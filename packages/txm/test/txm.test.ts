import { abis, deployment } from "@happy.tech/contracts/mocks/anvil"
import { err } from "neverthrow"
import { type Block, type Chain, createPublicClient, createWalletClient } from "viem"
import { http } from "viem"
import { privateKeyToAccount, privateKeyToAddress } from "viem/accounts"
import { anvil as anvilViemChain } from "viem/chains"
import { afterAll, beforeAll, expect, test, vi } from "vitest"
import { TxmHookType } from "../lib/HookManager"
import { AttemptType, TransactionStatus } from "../lib/Transaction"
import type { Transaction } from "../lib/Transaction"
import { TransactionManager } from "../lib/TransactionManager"
import { ethereumDefaultEIP1559Parameters } from "../lib/eip1559"
import { migrateToLatest } from "../lib/migrate"
import { ProxyBehavior, ProxyMode, ProxyServer } from "./utils/ProxyServer"
import { TestGasEstimator } from "./utils/TestGasEstimator"
import { TestRetryManager } from "./utils/TestRetryManager"
import { killAnvil, mineBlock } from "./utils/anvil"
import { startAnvil } from "./utils/anvil"
import {
    BASE_FEE_PERCENTAGE_MARGIN,
    BLOCK_GAS_LIMIT,
    CHAIN_ID,
    PRIVATE_KEY,
    PRIVATE_KEY_2,
    PROXY_URL,
} from "./utils/constants"
import { deployMockContracts } from "./utils/contracts"
import { assertIsDefined, assertReceiptReverted, assertReceiptSuccess } from "./utils/customAsserts"
import { cleanDB, getPersistedTransaction } from "./utils/db"

const retryManager = new TestRetryManager()

const txm = new TransactionManager({
    privateKey: PRIVATE_KEY,
    chainId: CHAIN_ID,
    rpc: {
        url: PROXY_URL,
        pollingInterval: 200,
        allowDebug: true,
    },
    abis: abis,
    gasEstimator: new TestGasEstimator(),
    retryPolicyManager: retryManager,
    baseFeePercentageMargin: BASE_FEE_PERCENTAGE_MARGIN,
    eip1559: ethereumDefaultEIP1559Parameters,
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

const secondAccountWallet = privateKeyToAccount(PRIVATE_KEY_2)

const secondWalletClient = createWalletClient({
    account: secondAccountWallet,
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

async function getCurrentBlock(): Promise<Block> {
    return await directBlockchainClient.getBlock({
        blockTag: "latest",
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

async function sendBurnGasTransactionWithSecondWallet(quantity: number) {
    for (let i = 0; i < quantity; i++) {
        await secondWalletClient.writeContract({
            address: deployment.MockGasBurner,
            abi: abis.MockGasBurner,
            functionName: "burnGas",
            args: [BigInt(BLOCK_GAS_LIMIT)],
        })
    }
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

test("NewBlock hook works correctly", async () => {
    let hookTriggered = false
    const cleanHook = await txm.addHook(TxmHookType.NewBlock, () => {
        hookTriggered = true
    })

    await mineBlock()

    expect(hookTriggered).toBe(true)

    cleanHook()
})

test("onTransactionStatusChanged hook works correctly", async () => {
    let hookTriggered = false

    const transaction = await createCounterTransaction()

    transactionQueue.push(transaction)

    const cleanHook = await txm.addHook(TxmHookType.TransactionStatusChanged, (transactionInHook) => {
        hookTriggered = true
        expect(transactionInHook.status).toBe(TransactionStatus.Success)
        expect(transactionInHook.intentId).toBe(transaction.intentId)
    })

    await mineBlock(2)

    expect(hookTriggered).toBe(true)

    cleanHook()
})

test("TransactionSubmissionFailed hook works correctly", async () => {
    let hookTriggered = false

    const previousCount = await getCurrentCounterValue()

    const cleanHook = await txm.addHook(TxmHookType.TransactionSubmissionFailed, (transactionInHook) => {
        hookTriggered = true
        expect(transactionInHook.status).toBe(TransactionStatus.Pending)
        expect(transactionInHook.intentId).toBe(transaction.intentId)
    })

    proxyServer.addBehavior(ProxyBehavior.Fail)

    const transaction = await createCounterTransaction()

    transactionQueue.push(transaction)

    await mineBlock(2)

    expect(hookTriggered).toBe(true)

    // Mine an additional block to ensure the transaction is included in the blockchain
    // and to establish a clean starting point for subsequent test cases
    await mineBlock()

    const retrievedTransaction = await txm.getTransaction(transaction.intentId)
    const persistedTransaction = await getPersistedTransaction(transaction.intentId)

    if (!assertIsDefined(retrievedTransaction)) return

    expect(retrievedTransaction.status).toBe(TransactionStatus.Success)
    expect(await getCurrentCounterValue()).toBe(previousCount + 1n)
    expect(persistedTransaction).toBeDefined()
    expect(persistedTransaction?.status).toBe(TransactionStatus.Success)

    cleanHook()
})

test("TransactionSaveFailed hook works correctly", async () => {
    let hookTriggered = false

    const cleanHook = await txm.addHook(TxmHookType.TransactionSaveFailed, (transactionInHook) => {
        hookTriggered = true
        expect(transactionInHook.status).toBe(TransactionStatus.Pending)
        expect(transactionInHook.intentId).toBe(transaction.intentId)
    })

    const transactionRepository = txm.transactionRepository

    const methodSpy = vi.spyOn(transactionRepository, "saveTransactions")

    methodSpy.mockResolvedValue(err(new Error("Test error")))

    const transaction = await createCounterTransaction()

    transactionQueue.push(transaction)

    await mineBlock(1)

    expect(hookTriggered).toBe(true)

    const persistedTransaction = await getPersistedTransaction(transaction.intentId)

    expect(persistedTransaction).toBeUndefined()

    cleanHook()
    vi.restoreAllMocks()
})

test("Simple transaction executed", async () => {
    const previousCount = await getCurrentCounterValue()

    const transaction = await createCounterTransaction()

    transactionQueue.push(transaction)

    const previousBlock = await getCurrentBlock()
    console.log("previousBlock", previousBlock)

    await mineBlock(2)

    const retrievedTransaction = await txm.getTransaction(transaction.intentId)

    if (!assertIsDefined(retrievedTransaction)) return

    const receipt = await directBlockchainClient.getTransactionReceipt({
        hash: retrievedTransaction.attempts[0].hash,
    })

    const persistedTransaction = await getPersistedTransaction(transaction.intentId)

    assertReceiptSuccess(deployment.HappyCounter, fromAddress, receipt)
    expect(retrievedTransaction?.status).toBe(TransactionStatus.Success)
    expect(await getCurrentCounterValue()).toBe(previousCount + 1n)
    expect(persistedTransaction).toBeDefined()
    expect(persistedTransaction?.status).toBe(TransactionStatus.Success)
    expect(retrievedTransaction?.lastAttempt?.nonce).toBe(nonceBeforeEachTest)
    expect(await getCurrentNonce()).toBe(nonceBeforeEachTest + 1)
    expect(retrievedTransaction.collectionBlock).toBe(previousBlock.number! + 1n)
})

test("Transaction retried", async () => {
    const previousCount = await getCurrentCounterValue()

    const transaction = await createCounterTransaction()

    proxyServer.addBehavior(ProxyBehavior.NotAnswer)

    transactionQueue.push(transaction)

    const previousBlock = await getCurrentBlock()

    await mineBlock(2)

    const transactionPending = await txm.getTransaction(transaction.intentId)

    if (!assertIsDefined(transactionPending)) return

    const latestAttemptPending = transactionPending.lastAttempt

    if (!assertIsDefined(latestAttemptPending)) return

    await expect(
        directBlockchainClient.getTransactionReceipt({
            hash: latestAttemptPending.hash,
        }),
    ).rejects.toThrow()

    expect(transactionPending.status).toBe(TransactionStatus.Pending)

    await mineBlock()

    const transactionSuccess = await txm.getTransaction(transaction.intentId)

    if (!assertIsDefined(transactionSuccess)) return

    const successReceipt = await directBlockchainClient.getTransactionReceipt({
        hash: transactionSuccess.attempts[1].hash,
    })

    const persistedTransaction = await getPersistedTransaction(transaction.intentId)

    assertReceiptSuccess(deployment.HappyCounter, fromAddress, successReceipt)
    expect(transactionSuccess.status).toBe(TransactionStatus.Success)
    expect(transaction.attempts.length).toBe(2)
    expect(await getCurrentCounterValue()).toBe(previousCount + 1n)
    expect(transactionSuccess.lastAttempt?.nonce).toBe(nonceBeforeEachTest)
    expect(persistedTransaction).toBeDefined()
    expect(persistedTransaction?.status).toBe(TransactionStatus.Success)
    expect(await getCurrentNonce()).toBe(nonceBeforeEachTest + 1)
    expect(transactionSuccess.collectionBlock).toBe(previousBlock.number! + 1n)
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

    const previousBlock = await getCurrentBlock()

    await mineBlock(2)

    const transactionReverted = await txm.getTransaction(transaction.intentId)

    if (!assertIsDefined(transactionReverted)) return

    const revertReceipt = await directBlockchainClient.getTransactionReceipt({
        hash: transactionReverted.attempts[0].hash,
    })

    const persistedTransaction = await getPersistedTransaction(transaction.intentId)

    const revertedWithCustomErrorResult = await retryManager.revertWithCustomError(
        txm,
        transactionReverted,
        transactionReverted.attempts[0],
        "CustomErrorMockRevert",
    )

    if (revertedWithCustomErrorResult.isErr()) {
        throw revertedWithCustomErrorResult.error
    }

    expect(transactionReverted.status).toBe(TransactionStatus.Failed)
    expect(transaction.attempts).length(1)
    assertReceiptReverted(deployment.MockRevert, fromAddress, revertReceipt)
    expect(await getCurrentCounterValue()).toBe(previousCount)
    expect(transactionReverted.lastAttempt?.nonce).toBe(nonceBeforeEachTest)
    expect(persistedTransaction).toBeDefined()
    expect(persistedTransaction?.status).toBe(TransactionStatus.Failed)
    expect(await getCurrentNonce()).toBe(nonceBeforeEachTest + 1)
    expect(transactionReverted.collectionBlock).toBe(previousBlock.number! + 1n)
    expect(revertedWithCustomErrorResult.value).toBe(true)
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

    const previousBlock = await getCurrentBlock()

    await mineBlock(2)

    const transactionReverted = await txm.getTransaction(transaction.intentId)

    if (!assertIsDefined(transactionReverted)) return

    const revertReceipt = await directBlockchainClient.getTransactionReceipt({
        hash: transactionReverted.attempts[0].hash,
    })

    const persistedTransaction = await getPersistedTransaction(transaction.intentId)

    const { message, output } = await retryManager.getRevertMessageAndOutput(txm, transactionReverted.attempts[0])

    expect(transactionReverted.status).toBe(TransactionStatus.Failed)
    expect(transaction.attempts).length(1)
    assertReceiptReverted(deployment.MockRevert, fromAddress, revertReceipt)
    expect(await getCurrentCounterValue()).toBe(previousCount)
    expect(transactionReverted.lastAttempt?.nonce).toBe(nonceBeforeEachTest)
    expect(retryManager.haveTriedToRetry(transaction.intentId)).toBeTruthy()
    expect(message).toMatch(/out of gas/i)
    expect(output).toBeUndefined()
    expect(revertReceipt.gasUsed).toBe(transactionReverted.attempts[0].gas)
    expect(persistedTransaction).toBeDefined()
    expect(persistedTransaction?.status).toBe(TransactionStatus.Failed)
    expect(await getCurrentNonce()).toBe(nonceBeforeEachTest + 1)
    expect(transactionReverted.collectionBlock).toBe(previousBlock.number! + 1n)
})

test("Transaction cancelled due to deadline passing", async () => {
    const previousCount = await getCurrentCounterValue()

    const deadline = Math.round(Date.now() / 1000 + 2)

    const transaction = await createCounterTransaction(deadline)

    proxyServer.addBehavior(ProxyBehavior.NotAnswer)

    transactionQueue.push(transaction)

    const previousBlock = await getCurrentBlock()

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

    if (!assertIsDefined(transactionCancelling)) return

    expect(transactionCancelling.status).toBe(TransactionStatus.Cancelling)

    await mineBlock()

    const transactionCancelled = await txm.getTransaction(transaction.intentId)

    if (!assertIsDefined(transactionCancelled)) return

    const latestAttempt = transactionCancelled.lastAttempt

    if (!assertIsDefined(latestAttempt)) return

    const receipt = await directBlockchainClient.getTransactionReceipt({
        hash: latestAttempt.hash,
    })

    const transactionExecuted = await directBlockchainClient.getTransaction({
        hash: latestAttempt.hash,
    })

    const persistedTransaction = await getPersistedTransaction(transaction.intentId)

    expect(transactionCancelled.status).toBe(TransactionStatus.Cancelled)
    assertReceiptSuccess(fromAddress, fromAddress, receipt)
    expect(transactionExecuted.input).toBe("0x")
    expect(receipt.gasUsed).toBe(21000n)
    expect(latestAttempt.type).toBe(AttemptType.Cancellation)
    expect(await getCurrentCounterValue()).toBe(previousCount)
    expect(transactionCancelled.lastAttempt?.nonce).toBe(nonceBeforeEachTest)
    expect(persistedTransaction).toBeDefined()
    expect(persistedTransaction?.status).toBe(TransactionStatus.Cancelled)
    expect(await getCurrentNonce()).toBe(nonceBeforeEachTest + 1)
    expect(transactionCancelled.collectionBlock).toBe(previousBlock.number! + 1n)
})

test("Correctly calculates baseFeePerGas after a block with high gas usage", async () => {
    const transactionBurner = await txm.createTransaction({
        address: deployment.MockGasBurner,
        functionName: "burnGas",
        contractName: "MockGasBurner",
        args: [BLOCK_GAS_LIMIT],
    })

    transactionQueue.push(transactionBurner)

    const previousBlock = await getCurrentBlock()

    await mineBlock(2)

    const transactionBurnerExecuted = await txm.getTransaction(transactionBurner.intentId)

    if (!assertIsDefined(transactionBurnerExecuted)) return

    const burnerReceipt = await directBlockchainClient.getTransactionReceipt({
        hash: transactionBurnerExecuted.attempts[0].hash,
    })

    const incrementerTransaction = await createCounterTransaction()

    transactionQueue.push(incrementerTransaction)

    await mineBlock(2)

    const currentBaseFee = (
        await directBlockchainClient.getBlock({
            blockTag: "latest",
        })
    ).baseFeePerGas

    const incrementerExecuted = await txm.getTransaction(incrementerTransaction.intentId)

    if (!assertIsDefined(incrementerExecuted)) return

    const attempt = incrementerExecuted.attempts[0]

    const persistedTransaction = await getPersistedTransaction(incrementerTransaction.intentId)

    expect(burnerReceipt.gasUsed).toBeGreaterThanOrEqual(BLOCK_GAS_LIMIT * 0.9)
    expect(attempt.maxFeePerGas - attempt.maxPriorityFeePerGas).toBe(currentBaseFee)
    expect(incrementerExecuted.status).toBe(TransactionStatus.Success)
    expect(persistedTransaction).toBeDefined()
    expect(persistedTransaction?.status).toBe(TransactionStatus.Success)
    expect(await getCurrentNonce()).toBe(nonceBeforeEachTest + 2)
    expect(transactionBurnerExecuted.collectionBlock).toBe(previousBlock.number! + 1n)
})

test("Transaction manager successfully processes transactions despite random RPC failures", async () => {
    proxyServer.setMode(ProxyMode.Random, {
        [ProxyBehavior.NotAnswer]: 0.1,
        [ProxyBehavior.Fail]: 0.2,
        [ProxyBehavior.Forward]: 0.7,
    })

    const previousBlock = await getCurrentBlock()
    const emittedTransactions: Transaction[] = []
    const numTransactions = 5
    for (let i = 0; i < numTransactions; i++) {
        const transaction = await createCounterTransaction()
        transactionQueue.push(transaction)
        emittedTransactions.push(transaction)

        await mineBlock()
    }

    await mineBlock(5)

    let successfulTransactions = 0
    for (const [index, transaction] of emittedTransactions.entries()) {
        const executedTransaction = await txm.getTransaction(transaction.intentId)

        if (executedTransaction?.status === TransactionStatus.Success) {
            successfulTransactions++
        }

        const persistedTransaction = await getPersistedTransaction(transaction.intentId)

        assertIsDefined(persistedTransaction)
        expect(persistedTransaction?.status).toBe(executedTransaction?.status)
        expect(executedTransaction?.collectionBlock).toBe(previousBlock.number! + BigInt(index + 1))
    }

    expect(successfulTransactions).toBeGreaterThan(numTransactions - 1)

    proxyServer.setMode(ProxyMode.Deterministic)
})

test("Transaction succeeds in congested blocks", async () => {
    const previousCount = await getCurrentCounterValue()

    await sendBurnGasTransactionWithSecondWallet(2)

    const incrementerTransaction = await createCounterTransaction()

    transactionQueue.push(incrementerTransaction)

    const previousBlock = await getCurrentBlock()

    let iterations = 0
    while (true) {
        await mineBlock()

        await sendBurnGasTransactionWithSecondWallet(2)

        const executedIncrementerTransaction = await txm.getTransaction(incrementerTransaction.intentId)

        if (executedIncrementerTransaction?.status === TransactionStatus.Success) {
            break
        }

        iterations++
    }

    const executedIncrementerTransaction = await txm.getTransaction(incrementerTransaction.intentId)

    if (!assertIsDefined(executedIncrementerTransaction)) return

    const persistedTransaction = await getPersistedTransaction(incrementerTransaction.intentId)

    const incrementerReceipt = await directBlockchainClient.getTransactionReceipt({
        hash: executedIncrementerTransaction.attempts[0].hash,
    })

    expect(iterations).toBeLessThan(5)
    expect(persistedTransaction).toBeDefined()
    expect(persistedTransaction?.status).toBe(TransactionStatus.Success)
    expect(incrementerReceipt.status).toBe("success")
    expect(await getCurrentCounterValue()).toBe(previousCount + 1n)
    expect(executedIncrementerTransaction.collectionBlock).toBe(previousBlock.number! + 1n)
})

test("Finalized transactions are automatically purged from db after finalizedTransactionPurgeTime elapses", async () => {
    const previousFinalizedTransactionPurgeTime = txm.finalizedTransactionPurgeTime

    const mockedFinalizedTransactionPurgeTime = 6000

    Object.defineProperty(txm, "finalizedTransactionPurgeTime", {
        value: mockedFinalizedTransactionPurgeTime,
        configurable: true,
    })

    const transaction = await createCounterTransaction()

    transactionQueue.push(transaction)

    await mineBlock(2)

    const transactionPersisted = await getPersistedTransaction(transaction.intentId)

    if (!assertIsDefined(transactionPersisted)) return

    expect(transactionPersisted.status).toBe(TransactionStatus.Success)

    const updatedAt = transactionPersisted.updatedAt

    while (true) {
        if (Date.now() > updatedAt + txm.finalizedTransactionPurgeTime) {
            break
        }

        const transactionPersisted = await getPersistedTransaction(transaction.intentId)

        expect(transactionPersisted).toBeDefined()
        expect(transactionPersisted?.status).toBe(TransactionStatus.Success)

        await mineBlock()
    }

    const persistedTransaction = await getPersistedTransaction(transaction.intentId)

    expect(persistedTransaction).toBeUndefined()

    Object.defineProperty(txm, "finalizedTransactionPurgeTime", {
        value: previousFinalizedTransactionPurgeTime,
        configurable: true,
    })
})
