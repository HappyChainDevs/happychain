import type { Address, Hex } from "viem"
import { http, createPublicClient, parseEther } from "viem"
import type { SmartAccount, UserOperation } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { localhost } from "viem/chains"

import type { SmartAccountClient } from "permissionless"
import type { Erc7579Actions } from "permissionless/actions/erc7579"

import { deployment } from "../deployments/anvil/testing/abis"
import { getCustomNonce } from "./getNonce"

import { deposit_paymaster, fund_smart_account, get_random_address } from "./utils/accounts"
import { account, publicClient } from "./utils/clients"
import { rpcURL } from "./utils/config"
import { checkBalance, toHexDigits } from "./utils/helpers"
import { getKernelAccount, getKernelClient } from "./utils/kernel"

const sessionKey = generatePrivateKey()
const sessionAccount = privateKeyToAccount(sessionKey)
const sessionPublicClient = createPublicClient({
    chain: localhost,
    transport: http(rpcURL),
})

// The address used when installing a validator module to signify that the module has no hooks.
// This is a special constant address that indicates the absence of any additional hooks.
const NO_HOOKS_ADDRESS = "0x0000000000000000000000000000000000000001"

// Function selector for transferring ETH from the smart account.
// The function selector must be whitelisted when installing a validator module to allow ETH transfers.
const EXECUTE_FUNCTION_SELECTOR = "0xe9ae5c53"
const AMOUNT = "0.01"

// An empty hex string to be used when signing over a userOperation.
const EMPTY_SIGNATURE = "0x"

function getInitData(hookAddress: Address, validatorData: Hex, hookData: Hex, selectorData: Hex): Hex {
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

    // validatorDataOffset = HookDataOffset.length + SelectorDataOffset.length + ValidatorDataLength.length
    const validatorDataOffset = 32 + 32 + 32
    const hexValidatorDataOffset = toHexDigits(BigInt(validatorDataOffset), 32)

    // hookDataOffset = validatorDataOffset + validatorData.length + hookDataLength.length
    const hookDataOffset = validatorDataOffset + validatorDataLen
    const hexHookDataOffset = toHexDigits(BigInt(hookDataOffset), 32)

    // selectorDataOffset = hookDataOffset + hookData.length + selectorDataLength.length
    const selectorDataOffset = hookDataOffset + 32 + hookDataLen + 32
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

async function installCustomModule(
    kernelAccount: SmartAccount,
    kernelClient: SmartAccountClient & Erc7579Actions<SmartAccount>,
    sessionKey: Address,
) {
    const opHash = await kernelClient.installModule({
        type: "validator",
        address: deployment.SessionKeyValidator,
        context: getInitData(NO_HOOKS_ADDRESS, sessionKey, "0x", EXECUTE_FUNCTION_SELECTOR),
        nonce: await kernelAccount.getNonce(),
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

async function uninstallCustomModule(
    kernelAccount: SmartAccount,
    kernelClient: SmartAccountClient & Erc7579Actions<SmartAccount>,
) {
    const opHash = await kernelClient.uninstallModule({
        type: "validator",
        address: deployment.SessionKeyValidator,
        context: NO_HOOKS_ADDRESS,
        nonce: await kernelAccount.getNonce(),
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

async function isCustomModuleInstalled(actionsClient: Erc7579Actions<SmartAccount>): Promise<boolean> {
    return await actionsClient.isModuleInstalled({
        type: "validator",
        address: deployment.SessionKeyValidator,
        context: "0x",
    })
}

async function testRootValidator(kernelAccount: SmartAccount, kernelClient: SmartAccountClient) {
    const receiverAddress = get_random_address()

    const txHash = await kernelClient.sendTransaction({
        account: kernelAccount,
        to: receiverAddress,
        chain: localhost,
        value: parseEther(AMOUNT),
    })

    const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1,
    })

    if (receipt.status !== "success") {
        throw new Error("KernelClient transaction failed")
    }

    const balance = await checkBalance(receiverAddress)
    if (balance === AMOUNT) {
        console.log(`Using RootValidator: Balance is correct: ${balance} ETH`)
    } else {
        throw new Error(`Using RootValidator: Balance is not correct: ${balance} ETH`)
    }
}

async function testCustomValidator(
    kernelAccount: SmartAccount,
    kernelClient: SmartAccountClient & Erc7579Actions<SmartAccount>,
    kernelAddress: Address,
) {
    const receiverAddress = get_random_address()
    const sessionSigner = await getKernelAccount(sessionPublicClient, sessionAccount)
    const customNonce = await getCustomNonce(kernelAccount.client, kernelAddress, deployment.SessionKeyValidator)

    await installCustomModule(kernelAccount, kernelClient, sessionAccount.address)

    const userOp: UserOperation<"0.7"> = await kernelClient.prepareUserOperation({
        account: kernelAccount,
        calls: [
            {
                to: receiverAddress,
                value: parseEther(AMOUNT),
                data: "0x",
            },
        ],
        nonce: customNonce,
    })

    userOp.signature = await sessionSigner.signUserOperation({
        ...userOp,
        chainId: localhost.id,
        signature: EMPTY_SIGNATURE, // The signature field must be empty when hashing and signing the user operation.
    })

    const userOpHash = await kernelClient.sendUserOperation({
        ...userOp,
    })

    const receipt = await kernelClient.waitForUserOperationReceipt({
        hash: userOpHash,
    })

    if (!receipt.success) {
        throw new Error("Validation using custom validator module failed")
    }

    const balance = await checkBalance(receiverAddress)
    if (balance === AMOUNT) {
        console.log(`Using CustomValidator: Balance is correct: ${balance} ETH`)
    } else {
        throw new Error(`Using CustomValidator: Balance is not correct: ${balance} ETH`)
    }

    await uninstallCustomModule(kernelAccount, kernelClient)
}

async function main() {
    const kernelAccount: SmartAccount = await getKernelAccount(publicClient, account)
    const kernelClient = getKernelClient(kernelAccount)
    const kernelAddress = await kernelAccount.getAddress()

    const prefundRes = await fund_smart_account(kernelAddress)
    if (prefundRes !== "success") {
        throw new Error("Funding SmartAccount failed")
    }

    const depositRes = await deposit_paymaster()
    if (depositRes !== "success") {
        throw new Error("Paymaster Deposit failed")
    }

    try {
        await testRootValidator(kernelAccount, kernelClient)
    } catch (error) {
        console.error("Root Validator: ", error)
    }

    try {
        await testCustomValidator(kernelAccount, kernelClient, kernelAddress)
    } catch (error) {
        console.error("Custom Validator: ", error)
    }
}

main().then(() => {
    process.exit(0)
})
