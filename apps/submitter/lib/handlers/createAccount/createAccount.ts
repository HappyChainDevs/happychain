import { type Address, type Optional, assertDef } from "@happy.tech/common"
import { abis, deployment, env } from "#lib/env"
import { outputForGenericError } from "#lib/handlers/errors"
import { evmNonceManager, evmReceiptService, publicClient, replaceTransaction, walletClient } from "#lib/services"
import { accountDeployer } from "#lib/services/evmAccounts"
import { traceFunction } from "#lib/telemetry/traces"
import { type EvmTxInfo, SubmitterError } from "#lib/types"
import { getFees } from "#lib/utils/gas"
import { logger } from "#lib/utils/logger"
import { decodeEvent } from "#lib/utils/parsing"
import { isNonceTooLowError } from "#lib/utils/viem"
import { computeHappyAccountAddress } from "./computeHappyAccountAddress"
import { CreateAccount, type CreateAccountInput, type CreateAccountOutput } from "./types"

const WaitForReceiptError = Symbol("WaitForReceiptError")

async function createAccount({ salt, owner }: CreateAccountInput): Promise<CreateAccountOutput> {
    assertDef(salt) // from validator
    let evmTxInfo: Optional<EvmTxInfo, "evmTxHash"> | undefined
    const predictedAddress = computeHappyAccountAddress(salt, owner)
    try {
        logger.trace("Predicted account address for owner", predictedAddress, owner, salt)

        // Check if a contract is already deployed at the predicted address
        const code = await publicClient.getCode({ address: predictedAddress })
        const alreadyDeployed = !!code && code !== "0x"

        if (alreadyDeployed) {
            logger.trace("Account already created", predictedAddress)
            const status = CreateAccount.AlreadyCreated
            return { status, salt, owner, address: predictedAddress }
        }

        const { fees, error } = getFees({ predictedAddress })
        if (error) return { status: SubmitterError.GasPriceTooHigh, error, owner, salt }
        const nonce = await evmNonceManager.consume(accountDeployer.address)
        evmTxInfo = { nonce, ...fees }

        logger.trace("Sending account creation tx", predictedAddress)
        const hash = await walletClient.writeContract({
            account: accountDeployer,
            address: deployment.HappyAccountBeaconProxyFactory,
            abi: abis.HappyAccountBeaconProxyFactory,
            functionName: "createAccount",
            args: [salt, owner],
            gas: env.ACCOUNT_CREATION_GAS_LIMIT,
            ...evmTxInfo,
        })
        evmTxInfo = { ...evmTxInfo, evmTxHash: hash }

        logger.trace("Waiting for account creation tx inclusion", predictedAddress, hash)
        const { receipt } = await evmReceiptService.waitForReceipt(hash, env.RECEIPT_TIMEOUT)
        if (!receipt) throw WaitForReceiptError
        logger.trace("Got receipt for account creation tx", predictedAddress, hash)

        if (receipt.status !== "success") {
            const error = "Account creation failed onchain"
            logger.error(error, owner, salt, receipt)
            return { status: CreateAccount.Failed, owner, salt, error }
        }

        const foundLog = receipt.logs.find((log) => decodeEvent(log)?.eventName === "Deployed")
        const event = foundLog && decodeEvent(foundLog)?.args

        if (!event) logger.warn("Couldn't find `Deployed` event in receipt")
        if (event?.account !== predictedAddress) {
            // The most likely causes for this is that the account deployment key is used concurrently outside of the
            // submitter or that we rebooted and that an old transaction we lost track of landed at this nonce.
            if (event) logger.error("Predicted and deployed addresses don't match.", predictedAddress, event?.account)
            const error = "Submitter transaction management issue, please try again."
            return { status: CreateAccount.Failed, owner, salt, error }
        }

        const address = (event?.account ?? predictedAddress) as Address
        logger.trace("Successfully created account", address, owner, salt)
        return { status: CreateAccount.Success, owner, salt, address }
    } catch (error) {
        if (isNonceTooLowError(error)) evmNonceManager.resyncIfTooLow(accountDeployer.address)

        if (evmTxInfo) {
            // The nonce has been consumed. A transaction must occur with that nonce because other other transactions
            // might have been queued behind it.
            const hash = evmTxInfo.evmTxHash
            const info = { hash, predictedAddress, account: accountDeployer.address }
            logger.warn("Account creation tx appears stuck, attempting resync", info)
            replaceTransaction(accountDeployer, evmTxInfo)
        }

        if (error === WaitForReceiptError) {
            // Can be either a timeout or a failure to fetch the receipt.
            // Can't fetch should be rare, the cure is the same, pretend it's a timeout.
            const error = "Timed out while waiting for receipt."
            return { status: CreateAccount.Timeout, error, owner, salt }
        }
        return { ...outputForGenericError(error), owner, salt }
    }
}

const tracedCreateAccount = traceFunction(createAccount)

export { tracedCreateAccount as createAccount }
