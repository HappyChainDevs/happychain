/**
 * Utilities to work with the session key boop extension.
 */

import { ExtensionType, ExtraDataKey, encodeExtraData } from "@happy.tech/boop-sdk"
import type { Address } from "@happy.tech/common"
import { EIP1193UnauthorizedError } from "@happy.tech/wallet-common"
import { encodeFunctionData } from "viem"
import { generatePrivateKey, privateKeyToAccount, privateKeyToAddress } from "viem/accounts"
import { extensibleAccountAbi, sessionKeyValidator, sessionKeyValidatorAbi } from "#src/constants/contracts"
import { PermissionName } from "#src/constants/permissions"
import { type SendBoopArgs, sendBoop } from "#src/requests/utils/boop"
import { eoaSigner } from "#src/requests/utils/signers"
import { StorageKey, storage } from "#src/services/storage"
import { revokedSessionKeys } from "#src/state/interfaceState"
import { getPermissions, grantPermissions, hasPermissions, revokePermissions } from "#src/state/permissions"
import { getPublicClient } from "#src/state/publicClient"
import { getCheckedUser } from "#src/state/user"
import { checkWalletClient } from "#src/state/walletClient"
import { type AppURL, getAppURL } from "#src/utils/appURL"
import { sessionKeyLogger } from "#src/utils/logger"

// =====================================================================================================================
// SESSION KEY CHECKS & UTILS

/**
 * Returns true iff the user has a session key registered for the target address.
 */
export function hasSessionKey(account: Address, target: Address, app: AppURL): boolean {
    const hasPermission = hasPermissions(app, { [PermissionName.SessionKey]: { target } })
    if (!hasPermission) return false
    const storedSessionKeys = storage.get(StorageKey.SessionKeys) || {}
    return Boolean(storedSessionKeys[account]?.[target])
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
 * Returns true iff the user has session key authorization for the target address.
 */
export function isSessionKeyAuthorized(app: AppURL, target: Address): boolean {
    const permissionRequest = { [PermissionName.SessionKey]: { target } }
    return getPermissions(app, permissionRequest).length > 0
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
 * Returns extraData for a boop, which will specify the session key validator
 * if a session key exists for the destination address, or be empty otherwise.
 */
export function createValidatorExtraData(account: Address, target: Address, app: AppURL): `0x${string}` {
    const extraData = hasSessionKey(account, target, app) ? { [ExtraDataKey.Validator]: sessionKeyValidator } : {}
    return encodeExtraData(extraData)
}

// =====================================================================================================================
// SESSION KEY EXTENSION MANAGEMENT

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
    checkWalletClient()
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

    const args = {
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
    } satisfies SendBoopArgs
    await sendBoop(args, getAppURL())
}

export async function uninstallSessionKeyExtension(account: Address) {
    sessionKeyLogger.trace("uninstallSessionKeyExtension", { account })
    checkWalletClient()
    const args = {
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
    } satisfies SendBoopArgs
    await sendBoop(args, getAppURL())
}

// =====================================================================================================================
// ADDING SESSION KEYS

/**
 * Installs and authorizes a new session key for the target address.
 */
export async function installNewSessionKey(app: AppURL, account: Address, target: Address): Promise<void> {
    const sessionKey = generatePrivateKey()
    const sessionAccount = privateKeyToAccount(sessionKey)

    // Always check validator installation onchain, as the validator contract address may change in the future.
    if (await isSessionKeyValidatorInstalled(account)) {
        await registerSessionKey(account, target, sessionAccount.address)
    } else {
        await installSessionKeyExtension(account, target, sessionAccount.address)
    }

    // Add permission & stores the session key.
    grantPermissions(app, { [PermissionName.SessionKey]: { target } })
    const storedSessionKeys = storage.get(StorageKey.SessionKeys) || {}
    storage.set(StorageKey.SessionKeys, {
        ...storedSessionKeys,
        [account]: {
            ...(storedSessionKeys[account] || {}),
            [target]: sessionKey,
        },
    })
}

async function registerSessionKey(account: Address, target: Address, sessionKeyAddress: Address): Promise<void> {
    sessionKeyLogger.trace("registerSessionKey", { account, target, sessionKeyAddress })
    const args = {
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
    } satisfies SendBoopArgs
    await sendBoop(args, getAppURL())
}

// =====================================================================================================================
// REMOVING SESSION KEYS

/**
 * Revokes the session keys for all the provided target addresses (for the provided app and current user).
 *
 * In particular, this performs three actions:
 *
 * 1. Revoke the permission itself via {@link revokePermissions}. This is safe if the permissions
 * has already been revoked, as is the case when using the permission management screen.
 *
 * 2. Deletes the session key from local storage.
 *
 * 3. Makes an onchain call to deregister the session key from the account.
 */
export async function revokeSessionKeys(app: AppURL, targets: Address[]): Promise<void> {
    if (targets.length === 0) return

    try {
        const user = getCheckedUser()
        const storedSessionKeys = storage.get(StorageKey.SessionKeys) || {}
        const userSessionKeys = { ...storedSessionKeys[user.address] }
        const keyAddresses = targets //
            .map((t) => userSessionKeys[t])
            .map((key) => (key ? privateKeyToAddress(key) : key))
        const onchainRemoveTargets = targets.filter((_, i) => !!keyAddresses[i])
        const onchainRemoveKeyAddresses = keyAddresses.filter(Boolean) as Address[]

        removeSessionKeys(user.address, onchainRemoveTargets, onchainRemoveKeyAddresses)

        for (const target of targets) {
            // revoke permission + accumulate session key deletions
            const permissionRequest = { [PermissionName.SessionKey]: { target } }
            revokePermissions(app, permissionRequest)
            revokedSessionKeys.clear()
            delete userSessionKeys[target]
        }

        // remove all keys keys from local storage
        storage.set(StorageKey.SessionKeys, {
            ...storedSessionKeys,
            [user.address]: userSessionKeys,
        })
    } catch (error) {
        sessionKeyLogger.error("failed to revoke session key", error)
        throw error
    }
}

async function removeSessionKey(account: Address, target: Address, keyAddress: Address): Promise<void> {
    sessionKeyLogger.trace("removeSessionKey", { account, target })
    checkWalletClient()
    const args = {
        account,
        signer: eoaSigner,
        tx: {
            to: sessionKeyValidator,
            from: account,
            data: encodeFunctionData({
                abi: sessionKeyValidatorAbi,
                functionName: "removeSessionKey",
                args: [target, keyAddress],
            }),
        },
    } satisfies SendBoopArgs
    await sendBoop(args, getAppURL())
}

async function removeSessionKeys(account: Address, targets: Address[], keyAddresses: Address[]): Promise<void> {
    if (targets.length === 1) removeSessionKey(account, targets[0], keyAddresses[0])
    sessionKeyLogger.trace("removeSessionKeys", { account, targets })
    checkWalletClient()
    const args = {
        account,
        signer: eoaSigner,
        tx: {
            to: sessionKeyValidator,
            from: account,
            data: encodeFunctionData({
                abi: sessionKeyValidatorAbi,
                functionName: "removeSessionKeys",
                args: [targets, keyAddresses],
            }),
        },
    } satisfies SendBoopArgs
    await sendBoop(args, getAppURL())
}
