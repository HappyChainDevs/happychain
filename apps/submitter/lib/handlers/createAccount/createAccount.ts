import { type Address, assertDef } from "@happy.tech/common"
import { createWalletClient } from "viem"
import { abis, deployment, env } from "#lib/env"
import { outputForGenericError } from "#lib/handlers/errors"
import { evmReceiptService } from "#lib/services"
import { accountDeployer } from "#lib/services/evmAccounts"
import { traceFunction } from "#lib/telemetry/traces"
import { config, publicClient } from "#lib/utils/clients"
import { getFees } from "#lib/utils/gas"
import { logger } from "#lib/utils/logger"
import { decodeEvent } from "#lib/utils/parsing"
import { computeHappyAccountAddress } from "./computeHappyAccountAddress"
import { CreateAccount, type CreateAccountInput, type CreateAccountOutput } from "./types"

const walletClient = createWalletClient({ ...config, account: accountDeployer })

async function createAccount({ salt, owner }: CreateAccountInput): Promise<CreateAccountOutput> {
    assertDef(salt) // from validator
    try {
        const predictedAddress = computeHappyAccountAddress(salt, owner)
        logger.trace("Predicted account address for owner", predictedAddress, owner, salt)

        // Check if a contract is already deployed at the predicted address
        const code = await publicClient.getCode({ address: predictedAddress })
        const alreadyDeployed = !!code && code !== "0x"

        if (alreadyDeployed) {
            logger.trace("Account already created", predictedAddress)
            const status = CreateAccount.AlreadyCreated
            return { status, salt, owner, address: predictedAddress }
        }

        // TODO must resync nonce if this fails
        logger.trace("Sending account creation tx", predictedAddress)
        const hash = await walletClient.writeContract({
            address: deployment.HappyAccountBeaconProxyFactory,
            abi: abis.HappyAccountBeaconProxyFactory,
            functionName: "createAccount",
            args: [salt, owner],
            account: accountDeployer,
            gas: env.ACCOUNT_CREATION_GAS_LIMIT,
            // TODO validate that fees are not above the max
            ...getFees(),
        })

        logger.trace("Waiting for account creation tx inclusion", predictedAddress, hash)
        const { receipt, timedOut, cantFetch } = await evmReceiptService.waitForReceipt(hash, env.RECEIPT_TIMEOUT)

        if (timedOut || cantFetch) {
            // Can't fetch should be rare, the cure is the same, pretend it's a timeout.
            const error = "Timed out while waiting for receipt."
            return { status: CreateAccount.Timeout, error, owner, salt }
        }

        logger.trace("Got receipt for account creation tx", predictedAddress, hash)

        if (receipt.status === "success") {
            const foundLog = receipt.logs.find((log) => decodeEvent(log)?.eventName === "Deployed")
            const event = foundLog && decodeEvent(foundLog)?.args

            if (!event) logger.warn("Couldn't find `Deployed` event in receipt")
            if (event?.account !== predictedAddress)
                logger.error("Predicted and deployed addresses don't match", {
                    predicted: predictedAddress,
                    deployed: event?.account,
                })

            const status = CreateAccount.Success
            const address = (event?.account ?? predictedAddress) as Address
            logger.trace("Successfully created account", address, owner, salt)
            return { status, owner, salt, address }
        }

        const error = "Account creation failed onchain"
        logger.error(error, owner, salt, receipt)
        return { status: CreateAccount.Failed, owner, salt, error }
    } catch (error) {
        return { ...outputForGenericError(error), owner, salt }
    }
}

const tracedCreateAccount = traceFunction(createAccount)

export { tracedCreateAccount as createAccount }
