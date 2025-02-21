import { Hono } from "hono"
import { describeRoute } from "hono-openapi"
import { resolver } from "hono-openapi/zod"
import { validator as zv } from "hono-openapi/zod"
import { http, type Address, createPublicClient, createWalletClient } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { z } from "zod"
import { chain } from "#src/clients"
import { abis, deployment } from "#src/deployments"
import env from "#src/env"
<<<<<<< HEAD
import { logger } from "#src/logger"
import * as createRoute from "./openApi/create"

||||||| parent of 0a6408cb (add basic createAccount deploy helper endpoint)

=======
import { isHexString } from "#src/zod/isHexString"
import "zod-openapi/extend"
import { logger } from "#src/logger"
>>>>>>> 0a6408cb (add basic createAccount deploy helper endpoint)
// Account responsible for deploying ScrappyAccounts
const account = privateKeyToAccount(env.PRIVATE_KEY_ACCOUNT_DEPLOYER)
const publicClient = createPublicClient({ chain, transport: http() })
const walletClient = createWalletClient({ chain, transport: http(), account })

<<<<<<< HEAD
export default new Hono().post("/create", createRoute.description, createRoute.validation, async (c) => {
    const { owner, salt } = await c.req.valid("json")
    logger.debug("Fetching Address", { owner, salt })
||||||| parent of 0a6408cb (add basic createAccount deploy helper endpoint)
export default new Hono().post("/create", async (c) => {
    const { owner, salt } = await c.req.json()
=======
const createDescription = describeRoute({
    description: "Estimate gas for the supplied HappyTx",
    responses: {
        200: {
            description: "Successful gas estimation",
            content: {
                "application/json": {
                    schema: resolver(
                        z
                            .object({ address: z.string().refine(isHexString) })
                            .openapi({ example: { address: "0x5b3064DD8C5A33e6F7Fb814FdCdb0c249bf57Ad2" } }),
                    ),
                },
            },
        },
    },
})

const createValidation = zv(
    "json",
    z
        .object({
            owner: z.string().refine(isHexString),
            salt: z
                .string()
                .max(66)
                .refine(isHexString)
                // convert to bytes32
                .transform((str) => `0x${str.slice(2).padStart(64, "0")}` as `0x${string}`),
        })
        .openapi({
            example: {
                owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
                salt: "0x1",
            },
        }),
)

export default new Hono().post("/create", createDescription, createValidation, async (c) => {
    const { owner, salt } = await c.req.valid("json")

    logger.debug("Fetching Address", { owner, salt })
>>>>>>> 0a6408cb (add basic createAccount deploy helper endpoint)

    const predictedAddress = await publicClient.readContract({
        address: deployment.ScrappyAccountFactory,
        abi: abis.ScrappyAccountFactory,
        functionName: "getAddress",
        args: [salt, owner],
    })
    logger.debug(`Predicted: ${predictedAddress}`)

    logger.debug(`Predicted: ${predictedAddress}`)

    // Check if a contract is already deployed at the predicted address
    const alreadyDeployed = await isContractDeployed(predictedAddress)
<<<<<<< HEAD
    if (alreadyDeployed) {
        logger.debug("Already Deployed!")
        return c.json({ address: predictedAddress }, 200)
    }
||||||| parent of 0a6408cb (add basic createAccount deploy helper endpoint)
    if (alreadyDeployed) return c.json({ address: predictedAddress }, 200)
=======

    logger.debug("Already Deployed!")

    if (alreadyDeployed) return c.json({ address: predictedAddress }, 200)
>>>>>>> 0a6408cb (add basic createAccount deploy helper endpoint)

    const { request, result } = await publicClient.simulateContract({
        address: deployment.ScrappyAccountFactory,
        abi: abis.ScrappyAccountFactory,
        functionName: "createAccount",
        args: [salt, owner],
        account,
    })
    logger.debug(`Account Simulation Result: ${result}`)

    logger.debug(`Account Simulation Result: ${result}`)

    // Check if the predicted address matches the result
    if (result !== predictedAddress) throw new Error("Address mismatch during simulation")

    const hash = await walletClient.writeContract(request)
    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    // validate deployment
    if (receipt.status !== "success") throw new Error("Transaction failed on-chain.")
    if (result !== predictedAddress) throw new Error("Address mismatch during deployment")
    if (!(await isContractDeployed(predictedAddress)))
        throw new Error(`Contract deployment failed: No code found at ${predictedAddress}`)

<<<<<<< HEAD
    logger.debug(`Account Creation Result: ${result}`)
||||||| parent of 0a6408cb (add basic createAccount deploy helper endpoint)
=======
    logger.debug(`Account Creation Result: ${result}`)

>>>>>>> 0a6408cb (add basic createAccount deploy helper endpoint)
    return c.json({ address: predictedAddress }, 200)
})

async function isContractDeployed(address: Address): Promise<boolean> {
    const code = await publicClient.getCode({ address })
    return code !== undefined && code !== "0x"
}
