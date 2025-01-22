import type { Erc7579Actions } from "permissionless/actions/erc7579"
import { type Address, type Hex, concat, numberToHex } from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import { getCurrentChain } from "#src/state/chains"
import type { ExtendedSmartAccountClient } from "#src/state/smartAccountClient"
import { getAccountAbstractionContracts } from "#src/utils/getAccountAbstractionContracts"

// The address used when installing a validator module to signify that the module has no hooks.
// This is a special constant address that indicates the absence of any additional hooks.
const NO_HOOKS_ADDRESS = "0x0000000000000000000000000000000000000001"

// The function selector must be whitelisted when installing a validator module.
// This is the selector for the execute() function that will be allowed to be called by session keys
const EXECUTE_FUNCTION_SELECTOR = "0xe9ae5c53"

/**
 * Converts a number to a hex string of specified size without `0x` prefix.
 * @param number - The number to convert to hex
 * @param size - The size in bytes of the resulting hex string
 * @returns The hex string without `0x` prefix
 */
function toHexDigits(number: bigint, size: number): string {
    return numberToHex(number, { size }).slice(2)
}

/**
 * Gets initialization data for installing a validator module.
 * This follows the data layout specified in the Kernel smart contract
 * @see {@link https://github.com/zerodevapp/kernel/blob/release/v3.1/src/Kernel.sol#L361-L366}
 *
 * @param hookAddress - The address of the hook contract (or NO_HOOKS_ADDRESS if no hooks)
 * @param validatorData - The data to be passed to the validator (in our case, the session key address)
 * @param hookData - The data to be passed to the hook (empty in our case)
 * @param selectorData - The function selectors that are allowed to be called (execute function in our case)
 * @returns The encoded module initialization data
 */
function getModuleInitData(hookAddress: Address, validatorData: Hex, hookData: Hex, selectorData: Hex): Hex {
    // Calculate lengths of each data section
    const validatorDataLen = validatorData.slice(2).length / 2
    const hookDataLen = hookData.slice(2).length / 2
    const selectorDataLen = selectorData.slice(2).length / 2

    // Convert lengths to hex format
    const hexValidatorDataLength = toHexDigits(BigInt(validatorDataLen), 32)
    const hexHookDataLength = toHexDigits(BigInt(hookDataLen), 32)
    const hexSelectorDataLength = toHexDigits(BigInt(selectorDataLen), 32)

    // Calculate offsets for each data section
    // Each offset is relative to 0x34 in the final layout (but why? maybe backwards compat)

    const validatorDataOffset = 32 + 32 + 32 // skip hookDataOffset, selectorDataOffset, and validatorDataLength.length
    const hexValidatorDataOffset = toHexDigits(BigInt(validatorDataOffset), 32)
    const hookDataOffset = validatorDataOffset + validatorDataLen + 32 // 32 = hookDataLength.length
    const hexHookDataOffset = toHexDigits(BigInt(hookDataOffset), 32)
    const selectorDataOffset = hookDataOffset + hookDataLen + 32 // 32 = selectorDataLength.length
    const hexSelectorDataOffset = toHexDigits(BigInt(selectorDataOffset), 32)

    // Concatenate all parts following the specified layout
    return (hookAddress + // hook address (with 0x prefix)
        hexValidatorDataOffset +
        // offsets index from here
        hexHookDataOffset +
        hexSelectorDataOffset +
        hexValidatorDataLength +
        validatorData.slice(2) + // Remove 0x prefix from data sections
        hexHookDataLength +
        hookData.slice(2) +
        hexSelectorDataLength +
        selectorData.slice(2)) as Hex
}

/**
 * Checks if the SessionKeyValidator module is installed for the current smart account
 * @param client - The smart account client with ERC-7579 actions.
 * @returns `true` if the module is installed, `false` otherwise.
 */
export async function checkIsSessionKeyModuleInstalled(client: Erc7579Actions<SmartAccount>) {
    const currentChain = getCurrentChain()?.chainId
    const contracts = getAccountAbstractionContracts(currentChain)
    return await client.isModuleInstalled({
        type: "validator",
        address: contracts.SessionKeyValidator,
        context: "0x",
    })
}

/**
 * Installs the SessionKeyValidator module for the smart account.
 * This module will validate transactions signed by session keys.
 *
 * @param client - The smart account client with ERC-7579 actions support.
 * @param sessionKey - Address of the session key (account) that will be authorized to sign transactions.
 * @param targetContract - Address of the contract this session key will be authorized to interact with.
 *
 * @throws {Error} If the module installation fails.
 * @example
 * ```
 * const sessionKey = generatePrivateKey()
 * const accountSessionKey = privateKeyToAccount(sessionKey)
 *
 * await installSessionKeyModule(
 *   smartAccountClient,
 *   accountSessionKey.address,
 *   "0x1234567890123456789012345678901234567890" // Target contract address
 * )
 * ```
 */
export async function installSessionKeyModule(
    client: ExtendedSmartAccountClient,
    sessionKey: Address,
    targetContract: Address,
) {
    const currentChain = getCurrentChain()?.chainId
    const contracts = getAccountAbstractionContracts(currentChain)
    const onInstallData = concat([sessionKey, targetContract])

    // Install the module with initial session key
    const opHash = await client.installModule({
        type: "validator",
        address: contracts.SessionKeyValidator,
        context: getModuleInitData(NO_HOOKS_ADDRESS, onInstallData, "0x", EXECUTE_FUNCTION_SELECTOR),
        nonce: await client.account!.getNonce(),
    })

    // Wait for the installation transaction to be confirmed
    const receipt = await client.waitForUserOperationReceipt({
        hash: opHash,
    })

    if (!receipt.success) {
        throw new Error("Module installation failed")
    }
}

/**
 * Registers a new session key with the SessionKeyValidator module.
 * This should be called when the module is already installed and we want to add a new session key.
 *
 * @param _client - The smart account client with user operation support.
 * @param _sessionKey - Address of the session key (account) that will be authorized to sign transactions.
 * @param _targetContract - Address of the contract this session key will be authorized to interact with.
 * @returns {Promise<`0x${string}`>} Hash of the user operation
 *
 * @example
 * ```
 * const sessionKey = generatePrivateKey()
 * const accountSessionKey = privateKeyToAccount(sessionKey)
 *
 * const userOpHash = await registerSessionKey(
 *   smartAccountClient,
 *   accountSessionKey.address,
 *   "0x1234567890123456789012345678901234567890" // Target contract address
 * )
 *
 * await smartAccountClient.waitForUserOperationReceipt({ hash: userOpHash })
 * ```
 */
export async function registerSessionKey(
    _client: ExtendedSmartAccountClient,
    _sessionKey: Address,
    _targetContract: Address,
) {
    // @todo - uncomment and test implementation once work on `addSessionKey()` is done
    /*
    const currentChain = getCurrentChain()?.chainId
    const abis = getAccountAbstractionAbis(currentChain)
    const calldata = encodeFunctionData({
        abi: abis.SessionKeyValidator,
        functionName: 'addSessionKey',
        args: [targetContract, sessionKey]
    })
    return await client.sendUserOperation({
        calls: [{
            to: contracts.SessionKeyValidator,
            data: addSessionKeyCalldata,
            value: 0n,
        }]
    })
    */
}
