import { createWalletClient } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { config, publicClient } from "#lib/clients"
import { abis, deployment } from "#lib/deployments"
import env from "#lib/env"
import { logger } from "#lib/logger"
import { isContractDeployed } from "#lib/utils/isContractDeployed"

// Account responsible for deploying ScrappyAccounts.
// May or may not be the same as the global submitter accounts
// so we define private/internal clients independently here.
const account = privateKeyToAccount(env.PRIVATE_KEY_ACCOUNT_DEPLOYER)
const walletClient = createWalletClient({ ...config, account })

// TODO return type + document errors
export async function create({ owner, salt }: { owner: `0x${string}`; salt: `0x${string}` }) {
    // TODO implement offchain to avoid the roundtrip
    const predictedAddress = await publicClient.readContract({
        address: deployment.ScrappyAccountFactory,
        abi: abis.ScrappyAccountFactory,
        functionName: "getAddress",
        args: [salt, owner],
    })
    logger.trace(`Predicted: ${predictedAddress}`)

    // Check if a contract is already deployed at the predicted address
    const alreadyDeployed = await isContractDeployed(predictedAddress)
    if (alreadyDeployed) {
        logger.trace("Already Deployed!")
        return { address: predictedAddress, salt, owner }
    }

    // TODO simulateContract is generally not necessary, can just pass the same args to writeContract
    //      directly and viem will do the simulation.
    const { request, result } = await publicClient.simulateContract({
        address: deployment.ScrappyAccountFactory,
        abi: abis.ScrappyAccountFactory,
        functionName: "createAccount",
        args: [salt, owner],
        account,
    })
    logger.trace(`Account Simulation Result: ${result}`)

    // Check if the predicted address matches the result
    if (result !== predictedAddress) throw new Error("Address mismatch during simulation")

    const hash = await walletClient.writeContract(request)
    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    // validate deployment
    if (receipt.status !== "success") throw new Error("Transaction failed on-chain.")
    // TODO I think we can skip this — if this happens we have more serious worries than whatever issue is caused by this
    if (!(await isContractDeployed(predictedAddress)))
        throw new Error(`Contract deployment failed: No code found at ${predictedAddress}`)

    logger.trace(`Account Creation Result: ${result}`)

    return { address: predictedAddress, salt, owner }
}
