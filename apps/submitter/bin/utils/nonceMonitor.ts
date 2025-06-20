/**
 * Utility to monitor nonces of executor keys before and after stress tests
 */

import type { Address } from "@happy.tech/common"
import { publicClient } from "#lib/utils/clients"

interface NonceState {
    address: Address
    nonce: number
}

interface NonceReport {
    before: NonceState[]
    after: NonceState[]
    diff: { address: Address; before: number; after: number; txCount: number }[]
    createdAccounts?: Address[]
}

// All executor keys and account deployer key to monitor
const KEYS_TO_MONITOR: Address[] = [
    // Account deployer key
    "0xf4822fC7CB2ec69A5f9D4b5d4a59B949eFfa8311",
    // Executor keys (foundry default keys)
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    "0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc",
    "0x976EA74026E726554dB657fA54763abd0C3a0aa9",
    "0x14dC79964da2C08b23698B3D3cc7Ca32193d9955",
    "0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f",
    "0xa0Ee7A142d267C1f36714E4a8F75612F20a79720",
]

/**
 * Get current nonces for all executor keys
 */
export async function getCurrentNonces(): Promise<NonceState[]> {
    const noncePromises = KEYS_TO_MONITOR.map(async (address) => {
        const nonce = await publicClient.getTransactionCount({
            address,
        })

        return {
            address,
            nonce,
        }
    })

    return Promise.all(noncePromises)
}

/**
 * Store of nonce states for comparison
 */
let initialNonceState: NonceState[] = []

/**
 * Store of accounts created during the test
 */
let createdAccounts: Address[] = []

/**
 * Track a new account that was created during the test
 */
export function trackCreatedAccount(address: Address): void {
    if (!createdAccounts.includes(address)) {
        createdAccounts.push(address)
    }
}

/**
 * Start monitoring nonces by capturing the initial state
 */
export async function startNonceMonitoring(): Promise<void> {
    // Reset the created accounts array
    createdAccounts = []
    console.log("\n=== Starting Nonce Monitoring ===")
    initialNonceState = await getCurrentNonces()

    console.log("Initial nonce state:")
    initialNonceState.forEach(({ address, nonce }) => {
        console.log(`${address}: ${nonce}`)
    })
}

/**
 * End monitoring and report the differences
 */
export async function endNonceMonitoring(): Promise<NonceReport> {
    console.log("\n=== Ending Nonce Monitoring ===")
    const finalNonceState = await getCurrentNonces()

    console.log("Final nonce state:")
    finalNonceState.forEach(({ address, nonce }) => {
        console.log(`${address}: ${nonce}`)
    })

    // Calculate differences
    const diff = finalNonceState.map(({ address, nonce: afterNonce }) => {
        const beforeState = initialNonceState.find((state) => state.address === address)
        const beforeNonce = beforeState ? beforeState.nonce : 0
        const txCount = afterNonce - beforeNonce

        return {
            address,
            before: beforeNonce,
            after: afterNonce,
            txCount,
        }
    })

    console.log("\n=== Nonce Differences (Transactions Sent) ===")
    diff.forEach(({ address, before, after, txCount }) => {
        if (txCount > 0) {
            console.log(`${address}: ${before} → ${after} (${txCount} transactions)`)
        }
    })

    const totalTxs = diff.reduce((sum, { txCount }) => sum + txCount, 0)
    console.log(`\nTotal transactions sent: ${totalTxs}`)

    // Show accounts created during the test
    if (createdAccounts.length > 0) {
        console.log(`\n=== ACCOUNTS CREATED DURING TEST (${createdAccounts.length}) ===`)
        createdAccounts.forEach((address, i) => {
            if (i < 10 || i >= createdAccounts.length - 5) {
                console.log(address)
            } else if (i === 10) {
                console.log(`... and ${createdAccounts.length - 15} more ...`)
            }
        })
    }

    return {
        before: initialNonceState,
        after: finalNonceState,
        diff,
        createdAccounts,
    }
}

/**
 * Check if an address matches a specific executor
 */
export function isExecutorAddress(address: Address, executorAddress: Address): boolean {
    return address.toLowerCase() === executorAddress.toLowerCase()
}

/**
 * Find which executor was used for a specific account creation
 * This is useful for tracking which executor was responsible for creating which accounts
 */
export async function findExecutorForAccount(_accountAddress: Address): Promise<Address | null> {
    // Return the account deployer key as the default executor for account creation
    return KEYS_TO_MONITOR[0] // Account deployer key is first in the array
}
