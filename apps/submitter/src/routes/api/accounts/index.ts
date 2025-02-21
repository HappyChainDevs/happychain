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
import { isHexString } from "#src/utils/zod/refines/isHexString"
import "zod-openapi/extend"
import { logger } from "#src/logger"
// Account responsible for deploying ScrappyAccounts
const account = privateKeyToAccount(env.PRIVATE_KEY_ACCOUNT_DEPLOYER)
const publicClient = createPublicClient({ chain, transport: http() })
const walletClient = createWalletClient({ chain, transport: http(), account })

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

    const predictedAddress = await publicClient.readContract({
        address: deployment.ScrappyAccountFactory,
        abi: abis.ScrappyAccountFactory,
        functionName: "getAddress",
        args: [salt, owner],
    })

    logger.debug(`Predicted: ${predictedAddress}`)

    // Check if a contract is already deployed at the predicted address
    const alreadyDeployed = await isContractDeployed(predictedAddress)

    logger.debug("Already Deployed!")

    if (alreadyDeployed) return c.json({ address: predictedAddress }, 200)

    const { request, result } = await publicClient.simulateContract({
        address: deployment.ScrappyAccountFactory,
        abi: abis.ScrappyAccountFactory,
        functionName: "createAccount",
        args: [salt, owner],
        account,
    })

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

    logger.debug(`Account Creation Result: ${result}`)

    return c.json({ address: predictedAddress }, 200)
})

async function isContractDeployed(address: Address): Promise<boolean> {
    const code = await publicClient.getCode({ address })
    return code !== undefined && code !== "0x"
}
