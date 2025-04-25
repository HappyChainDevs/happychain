import type { ExecuteOutput } from "@happy.tech/boop-sdk"
import type { Address } from "@happy.tech/common"
import { type Hex, encodeFunctionData } from "viem"
import { extensibleAccountAbi, sessionKeyValidator, sessionKeyValidatorAbi } from "#src/constants/contracts"
import { sendBoop } from "#src/requests/boop"
import { eoaSigner } from "#src/requests/utils"
import { StorageKey, storage } from "#src/services/storage"
import { getPublicClient } from "#src/state/publicClient"

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
export async function installSessionKeyExtension(
    account: Address,
    target?: Address,
    sessionKeyAddress?: Address,
): Promise<`0x${string}`> {
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
    console.log({ installData })
    return await sendBoop({
        account,
        isSponsored: true, // TODO: this breaks with paymaster
        tx: {
            to: account,
            data: encodeFunctionData({
                abi: extensibleAccountAbi,
                functionName: "addExtension",
                args: [sessionKeyValidator, EXTENSION_TYPE_VALIDATOR, installData],
            }),
        },
        signer: eoaSigner,
    })
}

export async function registerSessionKey(
    account: Address,
    target: Address,
    sessionKeyAddress: Address,
): Promise<ExecuteOutput> {
    return await sendBoop({
        account,
        isSponsored: true, // TODO: this breaks with paymaster
        signer: eoaSigner,
        tx: {
            to: sessionKeyValidator,
            data: encodeFunctionData({
                abi: sessionKeyValidatorAbi,
                functionName: "addSessionKey",
                args: [target, sessionKeyAddress],
            }),
        },
    })
}

export async function removeSessionKey(account: Address, target: Address): Promise<ExecuteOutput> {
    return await sendBoop({
        account,
        isSponsored: true, // TODO: this breaks with paymaster
        signer: eoaSigner,
        tx: {
            to: sessionKeyValidator,
            data: encodeFunctionData({
                abi: sessionKeyValidatorAbi,
                functionName: "removeSessionKey",
                args: [target],
            }),
        },
    })
}

export async function uninstallSessionKeyExtension(account: Address): Promise<`0x${string}`> {
    return await sendBoop({
        account,
        isSponsored: true, // TODO: this breaks with paymaster
        signer: eoaSigner,
        tx: {
            to: account,
            data: encodeFunctionData({
                abi: extensibleAccountAbi,
                functionName: "removeExtension",
                args: [sessionKeyValidator, EXTENSION_TYPE_VALIDATOR, "0x"],
            }),
        },
    })
}

export function getSessionKeyForTarget(userAddress: Address, target: Address): Address | undefined {
    const storedSessionKeys = storage.get(StorageKey.SessionKeys) || {}
    return storedSessionKeys[userAddress]?.[target]
}

export function hasExistingSessionKeys(userAddress: Address): boolean {
    const storedSessionKeys = storage.get(StorageKey.SessionKeys) || {}
    return Boolean(storedSessionKeys[userAddress])
}
