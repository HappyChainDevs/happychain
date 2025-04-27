import type { Address, Hex } from "@happy.tech/common"
import type { ContentfulStatusCode } from "hono/utils/http-status"
import { BaseError, createWalletClient } from "viem"
import { config, publicClient } from "#lib/clients"
import { abis, deployment } from "#lib/env"
import { extractErrorMessage } from "#lib/errors/utils"
import { decodeEvent } from "#lib/errors/viem"
import {
    type CreateAccountInput,
    type CreateAccountOutput,
    CreateAccountOwnStatus,
} from "#lib/interfaces/account_create"
import { SubmitterErrorStatus } from "#lib/interfaces/status.ts"
import { logger } from "#lib/logger"
import { computeHappyAccountAddress } from "#lib/utils/computeHappyAccountAddress.ts"
import { getAccountDeployerAccount } from "#lib/utils/getAccountDeployerAccount"
import { type BigIntSerialized, serializeBigInt } from "#lib/utils/serializeBigInt"

// Account responsible for deploying HappyAccounts.
// May or may not be the same as the global submitter accounts
// so we define private/internal clients independently here.
const account = getAccountDeployerAccount()
const walletClient = createWalletClient({ ...config, account })

export async function createFromRoute(
    input: CreateAccountInput,
): Promise<[BigIntSerialized<CreateAccountOutput>, ContentfulStatusCode]> {
    const output = await create(input)
    return ([CreateAccountOwnStatus.Success, CreateAccountOwnStatus.AlreadyCreated] as string[]).includes(output.status)
        ? [serializeBigInt(output), 200]
        : [serializeBigInt(output), 500]
}

export async function create({ salt, owner }: CreateAccountInput): Promise<CreateAccountOutput> {
    try {
        const predictedAddress = computeHappyAccountAddress(salt, owner)
        // For reference, fetch onchain with `_getPredictedAddressOnchain(salt, owner)`

        logger.trace("Predicted account address for owner", predictedAddress, owner, salt)

        // Check if a contract is already deployed at the predicted address
        const code = await publicClient.getCode({ address: predictedAddress })
        const alreadyDeployed = !!code && code !== "0x"

        if (alreadyDeployed) {
            logger.trace("Account already created", predictedAddress)
            const status = CreateAccountOwnStatus.AlreadyCreated
            return { status, salt, owner, address: predictedAddress }
        }

        logger.trace("Sending account creation transaction", owner, salt)
        const hash = await walletClient.writeContract({
            address: deployment.HappyAccountBeaconProxyFactory,
            abi: abis.HappyAccountBeaconProxyFactory,
            functionName: "createAccount",
            args: [salt, owner],
            account,
        })

        logger.trace("Waiting for transaction inclusion", hash, owner, salt)
        const receipt = await publicClient.waitForTransactionReceipt({ hash })

        if (receipt.status === "success") {
            const foundLog = receipt.logs.find((log) => decodeEvent(log)?.eventName === "Deployed")
            const event = foundLog && decodeEvent(foundLog)?.args

            if (!event) logger.warn("Couldn't find `Deployed` event in receipt")
            if (event?.address !== predictedAddress)
                logger.error("Predicted and deployed addresses don't match", event?.address, predictedAddress)

            const status = CreateAccountOwnStatus.Success
            const address = (event?.address ?? predictedAddress) as Address
            logger.trace("Successfully created account", address, owner, salt)
            return { status, owner, salt, address }
        }

        logger.error("Account creation failed onchain", owner, salt, receipt)
        return {
            status: CreateAccountOwnStatus.Failed,
            owner,
            salt,
            description: "Account creation failed onchain",
        }
    } catch (error) {
        if (error instanceof BaseError) {
            const status = SubmitterErrorStatus.RpcError
            return { status, owner, salt, description: error.message }
        }
        const status = SubmitterErrorStatus.UnexpectedError
        return { status, owner, salt, description: extractErrorMessage(error) }
    }
}

// For reference
async function _getPredictedAddressOnchain(salt: Hex, owner: Address): Promise<Address> {
    return await publicClient.readContract({
        address: deployment.HappyAccountBeaconProxyFactory,
        abi: abis.HappyAccountBeaconProxyFactory,
        functionName: "getAddress",
        args: [salt, owner],
    })
}
