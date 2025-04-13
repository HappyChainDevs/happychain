import { abis, deployment } from "@happy.tech/contracts/mocks/anvil"
import { err } from "neverthrow"
import { type Block, type Chain, type TransactionReceipt, createPublicClient, createWalletClient } from "viem"
import { http } from "viem"
import { privateKeyToAccount, privateKeyToAddress } from "viem/accounts"
import { anvil as anvilViemChain } from "viem/chains"
import { afterAll, beforeAll, expect, test, vi } from "vitest"
import { TxmHookType } from "../lib/HookManager"
import { AttemptType, TransactionStatus } from "../lib/Transaction"
import type { Attempt, Transaction } from "../lib/Transaction"
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
    RPC_URL,
} from "./utils/constants"
import { deployMockContracts } from "./utils/contracts"
import { assertIsDefined, assertIsOk, assertReceiptReverted, assertReceiptSuccess } from "./utils/customAsserts"
import { cleanDB, getPersistedTransaction } from "./utils/db"

const retryManager = new TestRetryManager()

const txm = new TransactionManager({
    privateKey: PRIVATE_KEY,
    chainId: CHAIN_ID,
    rpc: {
        url: PROXY_URL,
        pollingInterval: 200,
        allowDebug: true,
        livenessCheckInterval: 500,
        livenessDownDelay: 1000
    },
    abis: abis,
    gasEstimator: new TestGasEstimator(),
    retryPolicyManager: retryManager,
    gas: {
        baseFeePercentageMargin: BASE_FEE_PERCENTAGE_MARGIN,
        eip1559: ethereumDefaultEIP1559Parameters,
        minPriorityFeePerGas: 10n,
    },
    metrics: {
        active: false,
    },
})

const fromAddress = privateKeyToAddress(PRIVATE_KEY)

const proxyServer = new ProxyServer()

let transactionQueue: Transaction[] = []

txm.addTransactionOriginator(async () => {
    const transactions = transactionQueue
    transactionQueue = []
    return transactions
})

const chain: Chain = { ...anvilViemChain, id: CHAIN_ID, rpcUrls: { default: { http: [RPC_URL] } } }

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
            maxPriorityFeePerGas: 9n,
        })
    }
}

async function getReceiptForTransaction(transaction: Transaction): Promise<TransactionReceipt | undefined> {
    const receipts = await Promise.all(
        transaction.attempts.map((attempt) =>
            directBlockchainClient
                .getTransactionReceipt({
                    hash: attempt.hash,
                })
                .catch(() => undefined),
        ),
    )
    return receipts.find((receipt) => receipt !== undefined)
}

async function getExecutedAttemptForTransaction(transaction: Transaction): Promise<Attempt | undefined> {
    const results = await Promise.all(
        transaction.attempts.map((attempt) =>
            directBlockchainClient
                .getTransactionReceipt({
                    hash: attempt.hash,
                })
                .then((receipt) => (receipt ? attempt : undefined))
                .catch(() => undefined),
        ),
    )

    return results.find((attempt) => attempt !== undefined)
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
    proxyServer.setMode(ProxyMode.Deterministic)
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

    const retrievedTransactionResult = await txm.getTransaction(transaction.intentId)
    const persistedTransaction = await getPersistedTransaction(transaction.intentId)

    if (!assertIsOk(retrievedTransactionResult)) return

    const retrievedTransaction = retrievedTransactionResult.value

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

    await mineBlock(2)

    const retrievedTransactionResult = await txm.getTransaction(transaction.intentId)

    if (!assertIsOk(retrievedTransactionResult)) return

    const retrievedTransaction = retrievedTransactionResult.value

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

    const transactionPendingResult = await txm.getTransaction(transaction.intentId)

    if (!assertIsOk(transactionPendingResult)) return

    const transactionPending = transactionPendingResult.value

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

    const transactionSuccessResult = await txm.getTransaction(transaction.intentId)

    if (!assertIsOk(transactionSuccessResult)) return

    const transactionSuccess = transactionSuccessResult.value

    if (!assertIsDefined(transactionSuccess)) return

    const successReceipt = await directBlockchainClient.getTransactionReceipt({
        hash: transactionSuccess.attempts[0].hash,
    })

    const persistedTransaction = await getPersistedTransaction(transaction.intentId)

    assertReceiptSuccess(deployment.HappyCounter, fromAddress, successReceipt)
    expect(transactionSuccess.status).toBe(TransactionStatus.Success)
    expect(transaction.attempts.length).toBe(1)
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

    const transactionRevertedResult = await txm.getTransaction(transaction.intentId)

    if (!assertIsOk(transactionRevertedResult)) return

    const transactionReverted = transactionRevertedResult.value

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

    const transactionRevertedResult = await txm.getTransaction(transaction.intentId)

    if (!assertIsOk(transactionRevertedResult)) return

    const transactionReverted = transactionRevertedResult.value

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

    const transactionCancellingResult = await txm.getTransaction(transaction.intentId)

    if (!assertIsOk(transactionCancellingResult)) return

    const transactionCancelling = transactionCancellingResult.value

    if (!assertIsDefined(transactionCancelling)) return

    expect(transactionCancelling.status).toBe(TransactionStatus.Cancelling)

    await mineBlock()

    const transactionCancelledResult = await txm.getTransaction(transaction.intentId)

    if (!assertIsOk(transactionCancelledResult)) return

    const transactionCancelled = transactionCancelledResult.value

    if (!assertIsDefined(transactionCancelled)) return

    const attempt = await getExecutedAttemptForTransaction(transactionCancelled)

    if (!assertIsDefined(attempt)) return

    const receipt = await getReceiptForTransaction(transactionCancelled)

    if (!assertIsDefined(receipt)) return

    const transactionExecuted = await directBlockchainClient.getTransaction({
        hash: attempt.hash,
    })

    const persistedTransaction = await getPersistedTransaction(transaction.intentId)

    expect(transactionCancelled.status).toBe(TransactionStatus.Cancelled)
    assertReceiptSuccess(fromAddress, fromAddress, receipt)
    expect(transactionExecuted.input).toBe("0x")
    expect(receipt.gasUsed).toBe(21000n)
    expect(attempt.type).toBe(AttemptType.Cancellation)
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

    const transactionBurnerExecutedResult = await txm.getTransaction(transactionBurner.intentId)

    if (!assertIsOk(transactionBurnerExecutedResult)) return

    const transactionBurnerExecuted = transactionBurnerExecutedResult.value

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

    const incrementerExecutedResult = await txm.getTransaction(incrementerTransaction.intentId)

    if (!assertIsOk(incrementerExecutedResult)) return

    const incrementerExecuted = incrementerExecutedResult.value

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
    const previousLivenessThreshold = txm.livenessThreshold
    Object.defineProperty(txm, "livenessThreshold", {
        value: 0,
        configurable: true,
    })

    proxyServer.setMode(ProxyMode.Random, {
        [ProxyBehavior.NotAnswer]: 0.05,
        [ProxyBehavior.Fail]: 0.05,
        [ProxyBehavior.Forward]: 0.9,
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

    await mineBlock(14)

    let successfulTransactions = 0
    for (const [index, transaction] of emittedTransactions.entries()) {
        const executedTransactionResult = await txm.getTransaction(transaction.intentId)

        if (!assertIsOk(executedTransactionResult)) return

        const executedTransaction = executedTransactionResult.value

        if (!assertIsDefined(executedTransaction)) return

        if (executedTransaction.status === TransactionStatus.Success) {
            successfulTransactions++
        }

        const persistedTransaction = await getPersistedTransaction(transaction.intentId)

        assertIsDefined(persistedTransaction)
        expect(persistedTransaction?.status).toBe(executedTransaction?.status)
        expect(executedTransaction?.collectionBlock).toBe(previousBlock.number! + BigInt(index + 1))
    }

    expect(successfulTransactions).toBeGreaterThan(numTransactions * 0.4)

    proxyServer.setMode(ProxyMode.Deterministic)

    Object.defineProperty(txm, "livenessThreshold", {
        value: previousLivenessThreshold,
        configurable: true,
    })
})

test("Transaction succeeds in congested blocks", async () => {
    const previousCount = await getCurrentCounterValue()

    await sendBurnGasTransactionWithSecondWallet(2)

    const incrementerTransaction = await createCounterTransaction()

    transactionQueue.push(incrementerTransaction)

    const previousBlock = await getCurrentBlock()

    while (true) {
        await mineBlock()

        await sendBurnGasTransactionWithSecondWallet(2)

        const executedIncrementerTransactionResult = await txm.getTransaction(incrementerTransaction.intentId)

        if (!assertIsOk(executedIncrementerTransactionResult)) return

        const executedIncrementerTransaction = executedIncrementerTransactionResult.value

        if (!assertIsDefined(executedIncrementerTransaction)) return

        if (executedIncrementerTransaction.status === TransactionStatus.Success) {
            break
        }
    }

    const executedIncrementerTransactionResult = await txm.getTransaction(incrementerTransaction.intentId)

    if (!assertIsOk(executedIncrementerTransactionResult)) return

    const executedIncrementerTransaction = executedIncrementerTransactionResult.value

    if (!assertIsDefined(executedIncrementerTransaction)) return

    const persistedTransaction = await getPersistedTransaction(incrementerTransaction.intentId)

    const incrementerReceipt = await getReceiptForTransaction(executedIncrementerTransaction)

    if (!assertIsDefined(incrementerReceipt)) return

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
    const purgeTime = updatedAt + mockedFinalizedTransactionPurgeTime

    const spy = vi.spyOn(Date, "now")
    spy.mockReturnValue(purgeTime + 1000)

    await mineBlock(5)

    const persistedTransaction = await getPersistedTransaction(transaction.intentId)

    expect(persistedTransaction).toBeUndefined()

    Object.defineProperty(txm, "finalizedTransactionPurgeTime", {
        value: previousFinalizedTransactionPurgeTime,
        configurable: true,
    })
})

test("RPC liveness monitor works correctly", async () => {
    const previousLivenessWindow = txm.livenessWindow
    Object.defineProperty(txm, "livenessWindow", {
        value: 2000,
        configurable: true,
    })

    proxyServer.setMode(ProxyMode.Deterministic)

    while (!txm.rpcLivenessMonitor.isAlive) {
        const transaction = await createCounterTransaction()

        transactionQueue.push(transaction)

        await mineBlock()
    }

    proxyServer.setMode(ProxyMode.Random, {
        [ProxyBehavior.NotAnswer]: 0,
        [ProxyBehavior.Fail]: 0.5,
        [ProxyBehavior.Forward]: 0.5,
    })

    let isDownHookTriggered = false
    let isUpHookTriggered = false

    const cleanIsDownHook = await txm.addHook(TxmHookType.RpcIsDown, () => {
        isDownHookTriggered = true
    })

    const cleanIsUpHook = await txm.addHook(TxmHookType.RpcIsUp, () => {
        isUpHookTriggered = true
    })

    expect(txm.rpcLivenessMonitor.isAlive).toBe(true)

    while (txm.rpcLivenessMonitor.isAlive) {
        const transaction = await createCounterTransaction()

        transactionQueue.push(transaction)

        await mineBlock()
    }

    expect(isDownHookTriggered).toBe(true)
    expect(txm.rpcLivenessMonitor.isAlive).toBe(false)

    proxyServer.setMode(ProxyMode.Deterministic)

    while (!txm.rpcLivenessMonitor.isAlive) {
        const transaction = await createCounterTransaction()

        transactionQueue.push(transaction)

        await mineBlock()
    }

    expect(isUpHookTriggered).toBe(true)
    expect(txm.rpcLivenessMonitor.isAlive).toBe(true)

    cleanIsDownHook()
    cleanIsUpHook()

    Object.defineProperty(txm, "livenessWindow", {
        value: previousLivenessWindow,
        configurable: true,
    })
})
