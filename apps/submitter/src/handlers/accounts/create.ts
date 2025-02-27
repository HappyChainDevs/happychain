import type { Hex } from "@happy.tech/common"
import { createWalletClient } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { config, publicClient } from "#src/clients"
import { abis, deployment } from "#src/deployments"
import env from "#src/env"
import { logger } from "#src/logger"
import { isContractDeployed } from "#src/utils/isContractDeployed"

// Account responsible for deploying ScrappyAccounts
// May or may not be the same as the global submitter accounts
// so we define private/internal clients independently here
const account = privateKeyToAccount(env.PRIVATE_KEY_ACCOUNT_DEPLOYER)
const walletClient = createWalletClient({ ...config, account })

export async function create({ owner, salt }: { owner: `0x${string}`; salt: `0x${string}` }) {
    const validAccount = await getValidAddress({ owner, salt })
    logger.trace(`Predicted: ${validAccount.address}`)

    // Check if a contract is already deployed at the predicted address
    const alreadyDeployed = await isContractDeployed(validAccount.address)
    if (alreadyDeployed) {
        logger.trace("Already Deployed!")
        return validAccount
    }

    const { request, result } = await publicClient.simulateContract({
        address: deployment.ScrappyAccountFactory,
        abi: abis.ScrappyAccountFactory,
        functionName: "createAccount",
        args: [salt, owner],
        account,
    })
    logger.trace(`Account Simulation Result: ${result}`)

    // Check if the predicted address matches the result
    if (result !== validAccount.address) throw new Error("Address mismatch during simulation")

    const hash = await walletClient.writeContract(request)
    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    // validate deployment
    if (receipt.status !== "success") throw new Error("Transaction failed on-chain.")
    if (!(await isContractDeployed(validAccount.address)))
        throw new Error(`Contract deployment failed: No code found at ${validAccount.address}`)

    logger.trace(`Account Creation Result: ${result}`)

    return validAccount
}

async function getValidAddress({ salt, owner }: { salt: Hex; owner: Hex }) {
    let _salt = salt
    for (let i = 0; i < 10; i++) {
        logger.trace("Fetching Address", { owner, salt: _salt })
        // TODO: This could be calculated offchain to save a call
        // helper utility found in contracts/scripts/utils/getAddressERC1967.ts
        // HAPPY-389
        const predictedAddress = await publicClient.readContract({
            address: deployment.ScrappyAccountFactory,
            abi: abis.ScrappyAccountFactory,
            functionName: "getAddress",
            args: [_salt, owner],
        })

        if (!predictedAddress.toLowerCase().startsWith("0xef")) {
            return { address: predictedAddress, salt: _salt, owner }
        }

        // invalid address. increment salt and try again
        _salt = `0x${(BigInt(_salt) + 1n).toString(16)}`
    }

    throw new Error("Failed to find a valid address")
}
