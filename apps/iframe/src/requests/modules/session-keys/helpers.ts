// @todo - switch to import from happy-sepolia ;
// @todo - maybe write a helper function to return the appropriate contracts & ABIs depending on current chain ID ?
import { abis as happyAccAbsAbis, deployment as happyAccAbsDeployment } from "@happy.tech/contracts/happy-aa/anvil"
import { type HappyTx, computeBoopHash, EntryPointStatus } from "@happy.tech/submitter-client"
import { type Address, type Hash, type Hex, encodeFunctionData, isAddress } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { getBoopClient } from "#src/state/boopClient"
import { getPublicClient } from "#src/state/publicClient"

export const SESSION_KEY_VALIDATOR_ADDRESS = happyAccAbsDeployment.SessionKeyValidator as Address
const EXTENSION_TYPE_VALIDATOR = 0

/**
 * Creates extraData for custom validator according to Boop spec
 * @see Utils.getExtraDataValue - The corresponding function that extracts values from extraData
 *
 * @param validatorAddress - Validator contract address
 * @returns Hex string containing encoded extraData
 */
export function createValidatorExtraData(validatorAddress: Address): Hex {
    // According to Boop docs, extraData is structured as a packed list of (key, length, value) triplets
    // Key 1 is reserved for custom validator addresses

    const keyBytes = "000001" // Key 1 in 3 bytes
    const lengthBytes = "000014" // Length 20 in 3 bytes (address is 20 bytes)
    const validatorAddressBytes = validatorAddress.slice(2).toLowerCase() // Remove 0x prefix
    // @todo - Boop announcement noted this `We supply a library function to easily extract the value of a given key`
    // dove in the codebase but couldn't seem to find aforementioned function ?
    // so maybe this whole function is useless, TBD.

    return ("0x" + keyBytes + lengthBytes + validatorAddressBytes) as Hex
}

/**
 * Check if the SessionKeyValidator extension is registered with the account
 * @param accountAddress - The address of the Boop account
 * @returns `true` if the extension is registered, `false` otherwise
 */
export async function checkIsSessionKeyModuleInstalled(accountAddress: Address): Promise<boolean> {
    const publicClient = getPublicClient()

    try {
        // Using the IExtensibleAccount interface to check if the extension is registered
        const isRegistered = await publicClient.readContract({
            address: accountAddress,
            abi: happyAccAbsAbis.IExtensibleAccount,
            functionName: "isExtensionRegistered",
            args: [SESSION_KEY_VALIDATOR_ADDRESS, EXTENSION_TYPE_VALIDATOR],
        })

        return Boolean(isRegistered)
    } catch (error) {
        console.error("Error checking if session key validator is installed:", error)
        return false
    }
}

/**
 * Install the SessionKeyValidator extension on the account
 * @param accountAddress - The address of the Boop account
 * @param sessionKey - (Optional) Session key to authorize immediately during installation
 * @param targetContract - (Optional) Target contract for the session key
 * @returns Transaction hash
 */
export async function installSessionKeyModule(
    accountAddress: Address,
    sessionKey?: Address,
    targetContract?: Address,
): Promise<Hash> {
    const boopClient = await getBoopClient()
    if (!boopClient) throw new Error("Boop client not initialized")

    // Prepare transaction to add the SessionKeyValidator extension
    const callData = encodeFunctionData({
        abi: happyAccAbsAbis.IExtensibleAccount,
        functionName: "addExtension",
        args: [SESSION_KEY_VALIDATOR_ADDRESS, EXTENSION_TYPE_VALIDATOR],
    })

    // Execute the transaction to add the extension
    const result = await boopClient.boop.sendTransaction({
        dest: accountAddress, // The account itself is the destination
        callData,
        estimateGas: true,
    })

    if (result.isErr() || result.value.status !== EntryPointStatus.Success) {
        throw new Error("Failed to install session key validator")
    }

    const hash = result.value.hash!

    // If both session key & target contract are provided, register the session key directly
    if (sessionKey && isAddress(targetContract!)) {
        // Wait for installation to be confirmed...
        const publicClient = getPublicClient()
        await publicClient.waitForTransactionReceipt({ hash })

        // Register session key
        await registerSessionKey(sessionKey, targetContract as Address)
    }

    return hash
}

/**
 * Register a session key for a specific target contract
 * @param sessionKeyAddress - The address of the session key to register
 * @param targetContract - The address of the contract the session key can interact with
 * @returns Transaction hash
 */
export async function registerSessionKey(sessionKeyAddress: Address, targetContract: Address): Promise<Hash> {
    const boopClient = await getBoopClient()
    if (!boopClient) throw new Error("Boop client not initialized")

    const callData = encodeFunctionData({
        abi: happyAccAbsAbis.SessionKeyValidator,
        functionName: "addSessionKey",
        args: [targetContract, sessionKeyAddress],
    })

    const result = await boopClient.boop.sendTransaction({
        dest: SESSION_KEY_VALIDATOR_ADDRESS,
        callData,
        estimateGas: true,
    })

    if (result.isErr() || result.value.status !== EntryPointStatus.Success) {
        throw new Error("Failed to register session key") // @todo - use specific error ?
    }

    return result.value.hash!
}

/**
 * Sign a transaction using session key
 * @param privateKey - The private key associated to the session key
 * @param boop - The Boop transaction to sign
 */
export async function signWithSessionKey(privateKey: Address, boop: HappyTx): Promise<HappyTx> {
    // Create an account from the private key
    const account = privateKeyToAccount(privateKey)

    const boopToSign = {
        ...boop,
        validatorData: "" as Hex, // Temporarily empty for hash calculation
        // When using a session key, we don't need to sign gas parameters
        // These fields should be 0 according to SessionKeyValidator.sol
        gasLimit: 0n,
        validateGasLimit: 0n,
        validatePaymentGasLimit: 0n,
        executeGasLimit: 0n,
        maxFeePerGas: 0n,
        submitterFee: 0n,
    }
    const boopHash = computeBoopHash(boopToSign)
    const validatorData = await account.signMessage({
        message: { raw: boopHash },
    })

    // Create the extraData that specifies which validator to use
    const extraData = createValidatorExtraData(SESSION_KEY_VALIDATOR_ADDRESS)

    return {
        ...boop,
        validatorData,
        extraData,
    }
}

/**
 * Remove a session key for a specific target contract
 * @param targetContract - Contract address to remove the session key for
 * @returns Transaction hash
 */
export async function removeSessionKey(targetContract: Address): Promise<Hash> {
    const boopClient = await getBoopClient()
    if (!boopClient) throw new Error("Boop client not initialized")

    // Prepare transaction to remove the session key
    const callData = encodeFunctionData({
        abi: happyAccAbsAbis.SessionKeyValidator,
        functionName: "removeSessionKey",
        args: [targetContract],
    })

    const result = await boopClient.boop.sendTransaction({
        dest: SESSION_KEY_VALIDATOR_ADDRESS,
        callData,
        estimateGas: true,
    })

    if (result.isErr() || result.value.status !== EntryPointStatus.Success) {
        throw new Error("Failed to remove session key") // @todo - use specific error ?
    }

    return result.value.hash!
}

/**
 * Remove the SessionKeyValidator extension from the account
 * @param accountAddress - Boop account address
 * @returns Transaction hash
 */
export async function uninstallSessionKeyModule(accountAddress: Address): Promise<Hash> {
    const boopClient = await getBoopClient()
    if (!boopClient) throw new Error("Boop client not initialized")

    const callData = encodeFunctionData({
        abi: happyAccAbsAbis.IExtensibleAccount,
        functionName: "removeExtension",
        args: [SESSION_KEY_VALIDATOR_ADDRESS, EXTENSION_TYPE_VALIDATOR],
    })

    const result = await boopClient.boop.sendTransaction({
        dest: accountAddress,
        callData,
        estimateGas: true,
    })

    if (result.isErr() || result.value.status !== EntryPointStatus.Success) {
        throw new Error("Failed to uninstall session key validator") // @todo - use specific error ?
    }

    return result.value.hash!
}
