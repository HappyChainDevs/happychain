/**
 * Utilities to work with the session key boop extension.
 */

import { type Address, PermissionNames } from "@happy.tech/common"
import { EIP1193DisconnectedError, EIP1193UnauthorizedError } from "@happy.tech/wallet-common"
import { type Hex, encodeFunctionData } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { extensibleAccountAbi, sessionKeyValidator, sessionKeyValidatorAbi } from "#src/constants/contracts"
import { sendBoop } from "#src/requests/utils/boop"
import { eoaSigner } from "#src/requests/utils/signers"
import { StorageKey, storage } from "#src/services/storage"
import { getPermissions, grantPermissions } from "#src/state/permissions"
import { getPublicClient } from "#src/state/publicClient"
import { getWalletClient } from "#src/state/walletClient.ts"
import type { AppURL } from "#src/utils/appURL"

// TODO must expose from boop-sdk
const EXTENSION_TYPE_VALIDATOR = 0

/**
 * Creates extraData for custom validator according to Boop spec
 * @see Utils.getExtraDataValue - The corresponding function that extracts values from extraData
 *
 * @param validatorAddress - Validator contract address
 * @returns Hex string containing encoded extraData
 *
 * TODO a generic helper for this must be exposed from boop-sdk
 */
export function createValidatorExtraData(validatorAddress: Address): Hex {
    // extraData is structured as a packed list of (key, length, value) triplets
    const keyBytes = "000001" // key for the validator extension (1) encoded over 3 bytes
    const lengthBytes = "000014" // length 20 in 3 bytes (address is 20 bytes)
    const validatorAddressBytes = validatorAddress.slice(2).toLowerCase() // remove 0x prefix
    return ("0x" + keyBytes + lengthBytes + validatorAddressBytes) as Hex
}

export async function isSessionKeyValidatorInstalled(accountAddress: Address): Promise<boolean> {
    return await getPublicClient().readContract({
        address: accountAddress,
        abi: extensibleAccountAbi,
        functionName: "isExtensionRegistered",
        args: [sessionKeyValidator, EXTENSION_TYPE_VALIDATOR],
    })
}

/**
 * Install the SessionKeyValidator extension on the account. If the target address and session key
 * address are passed, register this initial session key as part of the extension installation.
 */
export async function installSessionKeyExtension(account: Address, target?: Address, sessionKeyAddress?: Address) {
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
            from: walletClient.account.address,
            data: encodeFunctionData({
                abi: extensibleAccountAbi,
                functionName: "addExtension",
                args: [sessionKeyValidator, EXTENSION_TYPE_VALIDATOR, installData],
            }),
        },
        signer: eoaSigner,
    })
}

export async function registerSessionKey(account: Address, target: Address, sessionKeyAddress: Address) {
    const walletClient = getWalletClient()
    if (!walletClient) throw new EIP1193DisconnectedError()
    return await sendBoop({
        account,
        signer: eoaSigner,
        tx: {
            to: sessionKeyValidator,
            from: walletClient.account.address,
            data: encodeFunctionData({
                abi: sessionKeyValidatorAbi,
                functionName: "addSessionKey",
                args: [target, sessionKeyAddress],
            }),
        },
    })
}

export async function removeSessionKey(account: Address, target: Address) {
    const walletClient = getWalletClient()
    if (!walletClient) throw new EIP1193DisconnectedError()
    await sendBoop({
        account,
        signer: eoaSigner,
        tx: {
            to: sessionKeyValidator,
            from: walletClient.account.address,
            data: encodeFunctionData({
                abi: sessionKeyValidatorAbi,
                functionName: "removeSessionKey",
                args: [target],
            }),
        },
    })
}

export async function uninstallSessionKeyExtension(account: Address) {
    const walletClient = getWalletClient()
    if (!walletClient) throw new EIP1193DisconnectedError()
    await sendBoop({
        account,
        signer: eoaSigner,
        tx: {
            to: account,
            from: walletClient.account.address,
            data: encodeFunctionData({
                abi: extensibleAccountAbi,
                functionName: "removeExtension",
                args: [sessionKeyValidator, EXTENSION_TYPE_VALIDATOR, "0x"],
            }),
        },
    })
}

/**
 * Returns true iff the user has any session key registered.
 */
export function hasExistingSessionKeys(account: Address): boolean {
    const storedSessionKeys = storage.get(StorageKey.SessionKeys) || {}
    return Boolean(storedSessionKeys[account])
}

/**
 * Returns true iff the user has session key authorization for the target address.
 */
export function isSessionKeyAuthorized(app: AppURL, target: Address): boolean {
    return (
        getPermissions(app, {
            [PermissionNames.SESSION_KEY]: { target },
        }).length > 0
    )
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
 * @throws TODO generic onchain interaction error
 */
export async function installNewSessionKey(app: AppURL, account: Address, target: Address): Promise<Address> {
    const sessionKey = generatePrivateKey()
    const sessionAccount = privateKeyToAccount(sessionKey)

    !hasExistingSessionKeys(account) && !(await isSessionKeyValidatorInstalled(account))
        ? await installSessionKeyExtension(account, target, sessionAccount.address)
        : await registerSessionKey(account, target, sessionAccount.address)

    authorizeSessionKey(app, account, target, sessionKey)
    return sessionAccount.address
}

/**
 * Authorizes & stores the session for the target address.
 */
export function authorizeSessionKey(app: AppURL, account: Address, target: Address, sessionKey: Hex) {
    grantPermissions(app, {
        [PermissionNames.SESSION_KEY]: { target },
    })
    const storedSessionKeys = storage.get(StorageKey.SessionKeys) || {}
    storage.set(StorageKey.SessionKeys, {
        ...storedSessionKeys,
        [account]: {
            ...(storedSessionKeys[account] || {}),
            [target]: sessionKey,
        },
    })
}
