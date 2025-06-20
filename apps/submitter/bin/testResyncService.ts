#!/usr/bin/env bun
// TODO — this script is a WIP!
import { type Hex, sleep } from "@happy.tech/common"
import { abis, deployment } from "@happy.tech/contracts/mocks/sepolia"
import {
    http,
    type Account,
    type WalletClient,
    createPublicClient,
    createWalletClient,
    encodeFunctionData,
    // formatEther,
    parseGwei,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { happychainTestnet } from "viem/chains"
import { resyncAccount } from "#lib/services/resync"

/**
 * This script tests the {@link resyncAccount} function by:
 * 1. Connecting to the testnet.happy.tech RPC endpoint
 * 2. Sending a few transactions with carefully tuned fees to stay in the mempool:
 *    - maxFeePerGas just at the baseFee level (to be accepted by the node)
 *    - maxPriorityFeePerGas set to 0 (to avoid being immediately included)
 * 3. Starting the submitter and verifying the resync service cancels them
 */

const BLOCK_GAS_LIMIT = 30_000_000
const NUM_STUCK_TXS = 10
const TX_GAS_AMOUNT = 1_500_000n
const NUM_BLOCKS_TO_FILL = 10
const MONITOR_TIMEOUT = 60_000
const NUM_FILLER_ACCOUNTS = 10
// const MIN_ACCOUNT_BALANCE = parseGwei("10000")

const TXS_PER_BLOCK = Math.floor(BLOCK_GAS_LIMIT / Number(TX_GAS_AMOUNT)) // 5
const TXNS_PER_FILLER = Math.floor((TXS_PER_BLOCK * NUM_BLOCKS_TO_FILL) / NUM_FILLER_ACCOUNTS) // Number of transactions per filler account

type TxInfo = {
    txHash: Hex
    address: `0x${string}`
    nonce: number
}

const RPC_HTTP_URL = process.env.RPC_HTTP_URLS?.split(",")[0] ?? "https://rpc.testnet.happy.tech/http"

// Get executor key from PRIVATE_KEY_ACCOUNT_DEPLOYER
const EXECUTOR_KEY = process.env.PRIVATE_KEY_ACCOUNT_DEPLOYER
if (!EXECUTOR_KEY) {
    throw new Error("Executor key not found in environment variables (PRIVATE_KEY_ACCOUNT_DEPLOYER)")
}

// Get block filler keys from EXECUTOR_KEYS (first 10 keys)
const BLOCK_FILLER_KEYS = process.env.EXECUTOR_KEYS?.split(",").slice(0, NUM_FILLER_ACCOUNTS)
if (!BLOCK_FILLER_KEYS || BLOCK_FILLER_KEYS.length < NUM_FILLER_ACCOUNTS) {
    throw new Error(`Need at least ${NUM_FILLER_ACCOUNTS} block filler keys in EXECUTOR_KEYS`)
}

const executorAccount = privateKeyToAccount(EXECUTOR_KEY as Hex)
const blockFillerAccounts = BLOCK_FILLER_KEYS.map((key) => privateKeyToAccount(key as Hex))

const executorWalletClient = createWalletClient({
    account: executorAccount,
    transport: http(RPC_HTTP_URL),
})

const blockFillerWalletClients = blockFillerAccounts.map((account) =>
    createWalletClient({
        account,
        transport: http(RPC_HTTP_URL),
    }),
)

const publicClient = createPublicClient({
    transport: http(RPC_HTTP_URL),
})

async function prepareBurnGasTx({
    account,
    walletClient,
    gas,
    gasToBurn,
    maxFeePerGas,
    maxPriorityFeePerGas,
    nonce,
}: {
    account: Account
    walletClient: WalletClient
    gas: bigint
    gasToBurn: bigint
    maxFeePerGas: bigint
    maxPriorityFeePerGas: bigint
    nonce: number
}): Promise<TxInfo> {
    const txHash = await walletClient.signTransaction(
        await walletClient.prepareTransactionRequest({
            account,
            chain: happychainTestnet,
            to: deployment.MockGasBurner,
            data: encodeFunctionData({
                abi: abis.MockGasBurner,
                functionName: "burnGas",
                args: [gasToBurn],
            }),
            nonce,
            gas,
            maxFeePerGas,
            maxPriorityFeePerGas,
        }),
    )

    return { txHash, address: account.address, nonce }
}

async function run(): Promise<void> {
    try {
        console.log("\n\x1b[1m\x1b[34m═════════ RESYNC SERVICE TEST ═════════\x1b[0m")

        //! Commented out printing of balance, as all 10 anvil keys have ample ETH
        // const executorBalance = await publicClient.getBalance({ address: executorAccount.address })
        // const fillerBalances = await Promise.all(
        //     blockFillerAccounts.map((account) => publicClient.getBalance({ address: account.address })),
        // )

        // console.log(`\nExecutor account: ${executorAccount.address}, balance: ${formatEther(executorBalance)} ETH`)
        // console.log(
        //     `Block filler accounts: ${blockFillerAccounts.map((account) => account.address).join(", ")}, \nbalances: ${fillerBalances
        //         .map((balance) => formatEther(balance))
        //         .join(", ")}`,
        // )

        // // Check if any account has insufficient balance
        // if (executorBalance < MIN_ACCOUNT_BALANCE) {
        //     console.error("\n\x1b[41m\x1b[37m INSUFFICIENT FUNDS \x1b[0m Executor account needs funding.")
        //     return
        // }

        // const insufficientFillerAccounts = fillerBalances.filter((balance) => balance < MIN_ACCOUNT_BALANCE)
        // if (insufficientFillerAccounts.length > 0) {
        //     console.error(`\n\x1b[41m\x1b[37m INSUFFICIENT FUNDS \x1b[0m ${insufficientFillerAccounts.length} filler accounts need funding.`)
        //     return
        // }

        const block = await publicClient.getBlock()
        const baseFee = block.baseFeePerGas || parseGwei("1")

        const executorLatestNonce = await publicClient.getTransactionCount({
            address: executorAccount.address,
            blockTag: "latest",
        })
        const executorPendingNonce = await publicClient.getTransactionCount({
            address: executorAccount.address,
            blockTag: "pending",
        })

        const fillerLatestNonces = await Promise.all(
            blockFillerAccounts.map((account) => publicClient.getTransactionCount({ address: account.address })),
        )

        console.log("\nCurrent network state:")
        console.log(`- Current block: ${block.number}, base fee: ${Number(baseFee)}`)
        console.log(`- Executor nonces: latest=${executorLatestNonce}, pending=${executorPendingNonce}`)
        console.log(`- Block filler nonces: latest=${fillerLatestNonces.join(", ")}`)

        const stuckPriorityFee = 0n
        const fillerPriorityFee = baseFee / 2n

        console.log(
            `\nPreparing ${NUM_FILLER_ACCOUNTS * TXNS_PER_FILLER} block-filling and ${NUM_STUCK_TXS} stuck transactions...`,
        )

        // Create block filler transactions organized by nonce offset
        // blockFillerTxs[0] = all txs with currentNonce, blockFillerTxs[1] = all txs with currentNonce+1, etc.
        const blockFillerTxs: TxInfo[][] = Array.from({ length: TXNS_PER_FILLER }, () => [])

        for (let txIndex = 0; txIndex < TXNS_PER_FILLER; txIndex++) {
            console.log(`\nCreating transaction batch ${txIndex} (nonce offset +${txIndex}) for all accounts`)

            for (let accountIndex = 0; accountIndex < blockFillerAccounts.length; accountIndex++) {
                const account = blockFillerAccounts[accountIndex]
                const walletClient = blockFillerWalletClients[accountIndex]
                const currentNonce = fillerLatestNonces[accountIndex] + txIndex

                // Increase gas price slightly for each batch to avoid replacement transaction underpriced errors
                // when transactions are reordered during sending
                const batchMultiplier = BigInt(txIndex + 1)
                const batchMaxFeePerGas = baseFee + (baseFee / 2n) * batchMultiplier

                // Make sure priority fee is always less than max fee
                const batchPriorityFee = fillerPriorityFee * batchMultiplier
                const adjustedPriorityFee =
                    batchPriorityFee < batchMaxFeePerGas ? batchPriorityFee : batchMaxFeePerGas - 1n

                const tx = await prepareBurnGasTx({
                    account,
                    walletClient,
                    gasToBurn: TX_GAS_AMOUNT,
                    gas: TX_GAS_AMOUNT + 42000n,
                    maxFeePerGas: batchMaxFeePerGas,
                    maxPriorityFeePerGas: adjustedPriorityFee,
                    nonce: currentNonce,
                })
                blockFillerTxs[txIndex].push(tx)
            }
        }

        // Create stuck transactions synchronously
        const stuckTxs: TxInfo[] = []
        console.log(
            `Creating ${NUM_STUCK_TXS} stuck transactions for executor account ${executorAccount.address} starting at nonce ${executorLatestNonce}`,
        )

        for (let i = 0; i < NUM_STUCK_TXS; i++) {
            const tx = await prepareBurnGasTx({
                account: executorAccount,
                walletClient: executorWalletClient,
                gasToBurn: TX_GAS_AMOUNT,
                gas: TX_GAS_AMOUNT + 42000n,
                maxFeePerGas: baseFee + baseFee / 5n, // Lower fee to ensure they stay in mempool
                maxPriorityFeePerGas: stuckPriorityFee,
                nonce: executorLatestNonce + i,
            })
            stuckTxs.push(tx)
            console.log(`  Created stuck tx for ${tx.address} with nonce ${tx.nonce}`)
        }

        // Order transactions:
        // 1. First 2 batches of block filler txs (nonce 0 and 1 for all accounts)
        // 2. All stuck transactions
        // 3. Remaining 3 batches of block filler txs (nonces 2, 3, 4 for all accounts)
        const orderedTxs = [
            // ...blockFillerTxs[0], // First batch - all accounts with nonce+0
            // ...blockFillerTxs[1], // Second batch - all accounts with nonce+1
            // ...blockFillerTxs[2], // Third batch - all accounts with nonce+2
            // ...blockFillerTxs[3], // Fourth batch - all accounts with nonce+3
            // ...blockFillerTxs[4], // Fifth batch - all accounts with nonce+4
            ...blockFillerTxs.flat(),
            ...stuckTxs, // All stuck transactions
        ]

        console.log(`\nSending ${orderedTxs.length} transactions in batches (non-blocking)...`)

        const startTime = Date.now()

        // Send transactions without awaiting - fire and forget for minimal latency
        orderedTxs.forEach((tx, index) => {
            // Use setTimeout to ensure minimal delay between sends and avoid overwhelming the RPC
            // setTimeout(() => {
            const _hash = publicClient.sendRawTransaction({ serializedTransaction: tx.txHash }).catch((error) => {
                console.error(
                    `Failed to send tx ${index} (address: ${tx.address}, nonce: ${tx.nonce}): ${error.message}`,
                )
            })
            // }, index * 10) // 10ms between each transaction
        })

        const sendDuration = Date.now() - startTime
        console.log(`Sent all ${orderedTxs.length} transactions in ${sendDuration}ms`)

        console.log("\n\x1b[1m\x1b[34m═════════ RUNNING RESYNC ═════════\x1b[0m")

        // Run resync and monitor nonce gap concurrently
        await Promise.all([resyncAccount(executorAccount, "recheck"), monitorNonceGap()])
    } catch (error) {
        console.error(`Error in test: ${error}`)
        process.exit(1)
    }
}

/**
 * Monitors the nonce gap between latest and pending nonces for the executor account.
 * Runs for up to MONITOR_TIMEOUT milliseconds, checking every second.
 * Resolves when the nonce gap is zero or when timeout is reached.
 */
async function monitorNonceGap(): Promise<void> {
    console.log("\n\x1b[1m\x1b[34m═════════ MONITORING NONCE GAP ═════════\x1b[0m")

    const monitorStartTime = Date.now()
    while (Date.now() - monitorStartTime < MONITOR_TIMEOUT) {
        const latestNonce = await publicClient.getTransactionCount({
            address: executorAccount.address,
            blockTag: "latest",
        })
        const pendingNonce = await publicClient.getTransactionCount({
            address: executorAccount.address,
            blockTag: "pending",
        })

        const nonceGap = pendingNonce - latestNonce

        console.log("\nLatest nonce:", latestNonce)
        console.log("Pending nonce:", pendingNonce)
        console.log("Nonce gap:", nonceGap)

        // if (nonceGap === 0) {
        //     console.log("\n\x1b[42m\x1b[30m SUCCESS \x1b[0m Nonce gap resolved successfully!")
        //     return
        // }

        await sleep(1000)
    }

    console.log("\n\x1b[43m\x1b[30m TIMEOUT \x1b[0m Monitoring timed out, nonce gap may still exist.")
}

run()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(`Error in test: ${error}`)
        process.exit(1)
    })
