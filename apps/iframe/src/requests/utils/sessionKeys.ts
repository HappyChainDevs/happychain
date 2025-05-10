/**
 * Utilities to work with the session key boop extension.
 */

import { ExtensionType, ExtraDataKey, encodeExtraData } from "@happy.tech/boop-sdk"
import { type Address, PermissionNames } from "@happy.tech/common"
import { EIP1193DisconnectedError, EIP1193UnauthorizedError } from "@happy.tech/wallet-common"
import { type Hex, encodeFunctionData } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { extensibleAccountAbi, sessionKeyValidator, sessionKeyValidatorAbi } from "#src/constants/contracts"
import { sendBoop } from "#src/requests/utils/boop"
import { eoaSigner } from "#src/requests/utils/signers"
import { StorageKey, storage } from "#src/services/storage"
import { revokedSessionKeys } from "#src/state/interfaceState.ts"
import { getPermissions, grantPermissions, revokePermissions } from "#src/state/permissions"
import { getPublicClient } from "#src/state/publicClient"
import { getUser } from "#src/state/user.ts"
import { getWalletClient } from "#src/state/walletClient.ts"
import type { AppURL } from "#src/utils/appURL"
import { sessionKeyLogger } from "#src/utils/logger"

/**
 * Creates extraData for custom validator according to Boop spec
 * @see Utils.getExtraDataValue - The corresponding function that extracts values from extraData
 *
 * @param validatorAddress - Validator contract address
 * @returns Hex string containing encoded extraData
 * TODO
 */
export function createValidatorExtraData(account: Address, target: Address): `0x${string}` {
    const extraData = hasSessionKey(account, target) ? { [ExtraDataKey.Validator]: sessionKeyValidator } : {}
    return encodeExtraData(extraData)
}

export async function isSessionKeyValidatorInstalled(accountAddress: Address): Promise<boolean> {
    return await getPublicClient().readContract({
        address: accountAddress,
        abi: extensibleAccountAbi,
        functionName: "isExtensionRegistered",
        args: [sessionKeyValidator, ExtensionType.Validator],
    })
}

/**
 * Install the SessionKeyValidator extension on the account. If the target address and session key
 * address are passed, register this initial session key as part of the extension installation.
 */
async function installSessionKeyExtension(account: Address, target?: Address, sessionKeyAddress?: Address) {
    sessionKeyLogger.trace("installSessionKeyExtension", { account, target, sessionKeyAddress })
    const walletClient = getWalletClient()
    if (!walletClient) throw new EIP1193DisconnectedError()
    // If a session key is provided, the installData of the `addExtension` call is an encoded
    // call to add the session key.
    const installData =
        target && sessionKeyAddress
            ? encodeFunctionData({
                  abi: sessionKeyValidatorAbi,
                  functionName: "addSessionKey",
                  args: [target, sessionKeyAddress],
              })
            : "0x"

    await sendBoop({
        account,
        tx: {
            to: account,
            from: account,
            data: encodeFunctionData({
                abi: extensibleAccountAbi,
                functionName: "addExtension",
                args: [sessionKeyValidator, ExtensionType.Validator, installData],
            }),
        },
        signer: eoaSigner,
    })
}

async function registerSessionKey(account: Address, target: Address, sessionKeyAddress: Address) {
    sessionKeyLogger.trace("registerSessionKey", { account, target, sessionKeyAddress })
    return await sendBoop({
        account,
        signer: eoaSigner,
        tx: {
            to: sessionKeyValidator,
            from: account,
            data: encodeFunctionData({
                abi: sessionKeyValidatorAbi,
                functionName: "addSessionKey",
                args: [target, sessionKeyAddress],
            }),
        },
    })
}

export async function removeSessionKey(account: Address, target: Address) {
    sessionKeyLogger.trace("removeSessionKey", { account, target })
    const walletClient = getWalletClient()
    if (!walletClient) throw new EIP1193DisconnectedError()
    await sendBoop({
        account,
        signer: eoaSigner,
        tx: {
            to: sessionKeyValidator,
            from: account,
            data: encodeFunctionData({
                abi: sessionKeyValidatorAbi,
                functionName: "removeSessionKey",
                args: [target],
            }),
        },
    })
}

export async function uninstallSessionKeyExtension(account: Address) {
    sessionKeyLogger.trace("uninstallSessionKeyExtension", { account })
    const walletClient = getWalletClient()
    if (!walletClient) throw new EIP1193DisconnectedError()
    await sendBoop({
        account,
        signer: eoaSigner,
        tx: {
            to: account,
            from: account,
            data: encodeFunctionData({
                abi: extensibleAccountAbi,
                functionName: "removeExtension",
                args: [sessionKeyValidator, ExtensionType.Validator, "0x"],
            }),
        },
    })
}

/**
 * Returns true iff the user has session key authorization for the target address.
 */
export function isSessionKeyAuthorized(app: AppURL, target: Address): boolean {
    const permissionRequest = { [PermissionNames.SESSION_KEY]: { target } }
    return getPermissions(app, permissionRequest).length > 0
}

/**
 * Returns true iff the user has a session key registered for the target address.
 */
export function hasSessionKey(account: Address, target: Address): boolean {
    const storedSessionKeys = storage.get(StorageKey.SessionKeys) || {}
    return Boolean(storedSessionKeys[account]?.[target])
}

/**
 * Checks if the user has session key authorization for the target address, otherwise throws.
 *
 * @throws EIP1193UnauthorizedError
 */
export function checkSessionKeyAuthorized(app: AppURL, target: Address) {
    if (!isSessionKeyAuthorized(app, target))
        throw new EIP1193UnauthorizedError(`no session key permission for ${target}`)
}

/**
 * Returns the account's session key for the target address. You must check session key permissions with {@link
 * isSessionKeyAuthorized} or {@link checkSessionKeyAuthorized} before calling this.
 *
 * @throws EIP1193UnauthorizedError if the session key can't be found
 */
export function getSessionKey(account: Address, target: Address): Address {
    const storedSessionKeys = storage.get(StorageKey.SessionKeys) || {}
    const key = storedSessionKeys[account]?.[target]
    if (!key) throw new EIP1193UnauthorizedError(`no session key for ${target}`)
    return key
}

/**
 * Installs and authorizes a new session key for the target address.
 *
 * @returns the session key address
 * @throws TODO: generic onchain interaction error
 */
export async function installNewSessionKey(app: AppURL, account: Address, target: Address): Promise<Address> {
    const sessionKey = generatePrivateKey()
    const sessionAccount = privateKeyToAccount(sessionKey)

    // Always check validator installation onchain, as the validator contract
    // address may change in the future.
    if (await isSessionKeyValidatorInstalled(account)) {
        await registerSessionKey(account, target, sessionAccount.address)
    } else {
        await installSessionKeyExtension(account, target, sessionAccount.address)
    }
    authorizeSessionKey(app, account, target, sessionKey)
    return sessionAccount.address
}

/**
 * Authorizes & stores the session for the target address.
 */
export function authorizeSessionKey(app: AppURL, account: Address, target: Address, sessionKey: Hex) {
    grantPermissions(app, { [PermissionNames.SESSION_KEY]: { target } })
    const storedSessionKeys = storage.get(StorageKey.SessionKeys) || {}
    storage.set(StorageKey.SessionKeys, {
        ...storedSessionKeys,
        [account]: {
            ...(storedSessionKeys[account] || {}),
            [target]: sessionKey,
        },
    })
}

export async function removeSessionKeys(account: Address, targets: Address[]) {
    sessionKeyLogger.trace("removeSessionKeys", { account, targets })
    const walletClient = getWalletClient()
    if (!walletClient) throw new EIP1193DisconnectedError()
    await sendBoop({
        account,
        signer: eoaSigner,
        tx: {
            to: sessionKeyValidator,
            from: account,
            data: encodeFunctionData({
                abi: sessionKeyValidatorAbi,
                functionName: "removeSessionKeys",
                args: [targets],
            }),
        },
    })
}

/**
 * Revokes all selected session key permissions granted to a specific dapp (`dappUrl`)
 * for the currently active user across a list of target contracts.
 *
 * This function performs the following steps:
 * 1. Retrieves the current user and list of target contracts.
 * 2. If either is missing, it exits early.
 * 3. Removes the session keys associated with those contracts from in-memory storage.
 * 4. Revokes the corresponding permissions from local storage.
 * 5. Updates the local session key store by removing entries tied to the revoked contracts.
 *
 * This ensures a full cleanup of session key authorization when navigating away
 * from dapp-specific contexts, such as a permission management screen.
 */
export async function revokeSessionKeyPermissions(appURL: AppURL, targets: Address[]): Promise<void> {
    if (targets.length === 0) return

    try {
        // TODO
        const user = getUser()
        if (!user) {
            throw new Error("no user defined")
        }

        removeSessionKeys(user.address, targets)
        const storedSessionKeys = storage.get(StorageKey.SessionKeys) || {}
        const userSessionKeys = { ...storedSessionKeys[user.address] }

        for (const contract of targets) {
            // remove permissions + session key entries from local storage
            const permissionRequest = {
                [PermissionNames.SESSION_KEY]: {
                    target: contract,
                },
            }
            revokePermissions(appURL, permissionRequest)
            revokedSessionKeys.clear()
            delete userSessionKeys[contract]
            storage.set(StorageKey.SessionKeys, {
                ...storedSessionKeys,
                [user!.address]: userSessionKeys,
            })
        }
    } catch (error) {
        console.error(error)
    }
}
