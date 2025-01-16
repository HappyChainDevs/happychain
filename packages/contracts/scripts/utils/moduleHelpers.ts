import type { SmartAccountClient } from "permissionless"
import type { Erc7579Actions } from "permissionless/actions/erc7579"
import type { Hex, PublicClient } from "viem"
import type { Address } from "viem"
import type { SmartAccount } from "viem/account-abstraction"
import { abis, deployment } from "../../deployments/anvil/testing/abis"
import { toHexDigits } from "./accounts"

// The address used when installing a validator module to signify that the module has no hooks.
// This is a special constant address that indicates the absence of any additional hooks.
const NO_HOOKS_ADDRESS = "0x0000000000000000000000000000000000000001"

// The function selector must be whitelisted when installing a validator module.
const EXECUTE_FUNCTION_SELECTOR = "0xe9ae5c53"

function getModuleInitData(hookAddress: Address, validatorData: Hex, hookData: Hex, selectorData: Hex): Hex {
    /**
     * Reference: https://github.com/zerodevapp/kernel/blob/release/v3.1/src/Kernel.sol#L361-L366
     * The layout is :-
     * - 0x00 (00): hook address
     * - 0x14 (20): validatorData offset from 0x34
     * - 0x34 (52): hookData offset from 0x34
     * - 0x54 (84): selectorData offset from 0x34
     * - [0x14 + validatordataOffset] : validatorDataLength
     * - [0x34 + validatorDataOffset] : validatorData
     * - [0x14 + hookDataOffset]      : hookDataLength
     * - [0x34 + hookDataOffset]      : hookData
     * - [0x14 + selectorDataOffset]  : selectorDataLength
     * - [0x34 + selectorDataOffset]  : selectorData
     */

    const validatorDataLen = validatorData.slice(2).length / 2
    const hookDataLen = hookData.slice(2).length / 2
    const selectorDataLen = selectorData.slice(2).length / 2

    const hexValidatorDataLength = toHexDigits(BigInt(validatorDataLen), 32)
    const hexHookDataLength = toHexDigits(BigInt(hookDataLen), 32)
    const hexSelectorDataLength = toHexDigits(BigInt(selectorDataLen), 32)

    /**
     * Calculate offsets for each data section.
     * Each offset is relative to 0x34 in the final layout (but why? maybe backwards compat)
     */

    // validatorDataOffset = HookDataOffset.length + SelectorDataOffset.length + ValidatorDataLength.length
    const validatorDataOffset = 32 + 32 + 32 // skip hookDataOffset, selectorDataOffset, and validatorDataLength.length
    const hexValidatorDataOffset = toHexDigits(BigInt(validatorDataOffset), 32)

    // hookDataOffset = validatorDataOffset + validatorData.length + hookDataLength.length
    const hookDataOffset = validatorDataOffset + validatorDataLen + 32 // 32 = hookDataLength.length
    const hexHookDataOffset = toHexDigits(BigInt(hookDataOffset), 32)

    // selectorDataOffset = hookDataOffset + hookData.length + selectorDataLength.length
    const selectorDataOffset = hookDataOffset + hookDataLen + 32 // 32 = selectorDataLength.length
    const hexSelectorDataOffset = toHexDigits(BigInt(selectorDataOffset), 32)

    // biome-ignore format: readability
    return (
        hookAddress + // starts with "0x"
        hexValidatorDataOffset +
        hexHookDataOffset +
        hexSelectorDataOffset +
        hexValidatorDataLength +
        validatorData.slice(2) +
        hexHookDataLength +
        hookData.slice(2) +
        hexSelectorDataLength +
        selectorData.slice(2)
    ) as Hex
}

async function isCustomModuleInstalled(actionsClient: Erc7579Actions<SmartAccount>): Promise<boolean> {
    return await actionsClient.isModuleInstalled({
        type: "validator",
        address: deployment.SessionKeyValidator,
        context: "0x",
    })
}

export async function installCustomModule(
    kernelClient: SmartAccountClient & Erc7579Actions<SmartAccount>,
    onInstallData: Address,
) {
    const moduleInitData = getModuleInitData(NO_HOOKS_ADDRESS, onInstallData, "0x", EXECUTE_FUNCTION_SELECTOR)
    const opHash = await kernelClient.installModule({
        type: "validator",
        address: deployment.SessionKeyValidator,
        context: moduleInitData,
        nonce: await kernelClient.account!.getNonce(),
    })

    const rec = await kernelClient.waitForUserOperationReceipt({
        hash: opHash,
    })

    if (!rec.success) {
        throw new Error("Module Installation failed")
    }

    const isInstalled = await isCustomModuleInstalled(kernelClient)
    if (!isInstalled) {
        throw new Error("Module is not installed")
    }
}

export async function uninstallCustomModule(kernelClient: SmartAccountClient & Erc7579Actions<SmartAccount>) {
    const opHash = await kernelClient.uninstallModule({
        type: "validator",
        address: deployment.SessionKeyValidator,
        context: NO_HOOKS_ADDRESS,
        nonce: await kernelClient.account!.getNonce(),
    })

    const rec = await kernelClient.waitForUserOperationReceipt({
        hash: opHash,
    })

    if (!rec.success) {
        throw new Error("Module Uninstallation failed")
    }

    const isInstalled = await isCustomModuleInstalled(kernelClient)
    if (isInstalled) {
        throw new Error("Module is not uninstalled")
    }
}

export async function readStorageKey(
    publicClient: PublicClient,
    smartAccountAddress: Address,
    targetContract: Address,
) {
    // get key hash (could also do this locally)
    const keyHash = await publicClient.readContract({
        abi: abis.SessionKeyValidator,
        address: deployment.SessionKeyValidator,
        functionName: "getStorageKey",
        args: [smartAccountAddress, targetContract],
    })

    // get from mapping
    return await publicClient.readContract({
        abi: abis.SessionKeyValidator,
        address: deployment.SessionKeyValidator,
        functionName: "sessionKeyValidatorStorage",
        args: [keyHash],
    })
}
