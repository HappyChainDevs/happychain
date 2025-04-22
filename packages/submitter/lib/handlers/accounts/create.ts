import { type Result, err, ok } from "neverthrow"
import { type WriteContractParameters, createWalletClient } from "viem"
import { config, publicClient } from "#lib/clients"
import { abis, deployment, env } from "#lib/env"
import { SubmitterError } from "#lib/errors/submitter-errors"
import { logger } from "#lib/logger"
import type { CreateAccountInput, CreateAccountOutput } from "#lib/tmp/interface/create_account"
import { getAccountDeployerAccount } from "#lib/utils/getAccountDeployerAccount"
import { isContractDeployed } from "#lib/utils/isContractDeployed"

// Account responsible for deploying HappyAccounts.
// May or may not be the same as the global submitter accounts
// so we define private/internal clients independently here.
const account = getAccountDeployerAccount()
const walletClient = createWalletClient({ ...config, account })

export async function create({ owner, salt }: CreateAccountInput): Promise<Result<CreateAccountOutput, Error>> {
    const predictedAddress = await publicClient.readContract({
        address: deployment.HappyAccountBeaconProxyFactory,
        abi: abis.HappyAccountBeaconProxyFactory,
        functionName: "getAddress",
        args: [salt, owner],
    })

    // TODO: replace when ready
    // const predictedAddress = computeHappyAccount(salt, owner)

    logger.trace(`Predicted: ${predictedAddress}`)

    // Check if a contract is already deployed at the predicted address
    const alreadyDeployed = await isContractDeployed(predictedAddress)

    if (alreadyDeployed) {
        logger.trace("Already Deployed!")
        return ok({ address: predictedAddress, salt, owner })
    }

    const { request, result } = await publicClient.simulateContract({
        address: deployment.HappyAccountBeaconProxyFactory,
        abi: abis.HappyAccountBeaconProxyFactory,
        functionName: "createAccount",
        args: [salt, owner],
        account,
    })

    logger.trace(`Account Simulation Result: ${result}`)

    // Check if the predicted address matches the result
    if (result !== predictedAddress) return err(new SubmitterError("Address mismatch during simulation"))

    const receipt = await safeSendTransaction(request)

    if (receipt.isErr()) {
        logger.warn(`Failed to deploy HappyAccount: ${receipt.error}`)
        return err(new SubmitterError("Transaction failed on-chain."))
    }

    logger.trace(`HappyAccount Creation Result: ${result}`)
    return ok({ address: predictedAddress, salt, owner })
}

async function safeSendTransaction(request: WriteContractParameters) {
    try {
        const hash = await walletClient.writeContract(request)
        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        if (receipt.status === "success") return ok(receipt)
        return err(receipt)
    } catch (error) {
        return err(error)
    }
}
