import { HappyMethodNames } from "@happy.tech/common"
import type { Address } from "@happy.tech/common"
import type { HappyUser } from "@happy.tech/wallet-common"
import type { Abi } from "viem"
import { internalProvider } from "./happyProvider"
import type { ListenerUnsubscribeFn, UserUpdateCallback } from "./happyProvider/listeners"

// This file contains the definition of all the publicly exported functions, with the exception
// of `register` and the Viem & Wagmi helpers.

/**
 * @returns The user currently connected to the app, if any.
 */
export const getCurrentUser = (): HappyUser | undefined => {
    return internalProvider.getCurrentUser()
}

/**
 * Connect the app to the Happy Account (will prompt user for permission).
 */
export const connect = async (): Promise<void> => {
    await internalProvider.request({
        method: "eth_requestAccounts",
    })
}

/**
 * Disconnect the app from the Happy Account.
 */
export const disconnect = async (): Promise<void> => {
    await internalProvider.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
    })
}

/**
 * Loads the given ABI for the given contract, enabling transaction requests to display
 * information about the functions being called, instead of raw calldata.
 */
export const loadAbi = async (contractAddress: Address, abi: Abi): Promise<void> => {
    await internalProvider.request({
        method: HappyMethodNames.LOAD_ABI,
        params: {
            address: contractAddress,
            abi: abi,
        },
    })
}

/**
 * Requests a session key that makes it possible to transaction with the given contract without
 * user approval (i.e. popups). Nothing is returned: instead transaction requests for the given
 * contracts are automatically approved.
 */
export const requestSessionKey = async (target: Address): Promise<void> => {
    await internalProvider.request({
        method: HappyMethodNames.REQUEST_SESSION_KEY,
        params: [target],
    })
}

/**
 * Revokes a session key for the given contract, if one exists.
 */
export const revokeSessionKey = async (target: Address): Promise<void> => {
    await internalProvider.request({
        method: "wallet_revokePermissions",
        params: [{ happy_sessionKey: { target } }],
    })
}

/**
 * Display the send screen in the iframe
 */
export const showSendScreen = (): void => {
    void internalProvider.showSendScreen()
}

/**
 * Makes the wallet pop open.
 */
export function openWallet() {
    internalProvider.displayWallet(true)
}

/**
 * Makes the wallet close.
 */
export function closeWallet() {
    internalProvider.displayWallet(false)
}

/**
 * Register a callback that gets called whenever the user changes.
 */
export function onUserUpdate(callback: UserUpdateCallback): ListenerUnsubscribeFn {
    return internalProvider.onUserUpdate(callback)
}
