import { Hono } from "hono"
import type { Address } from "viem"
import { account, publicClient, walletClient } from "#src/clients"
import { abis, deployment } from "#src/deployments"

export default new Hono().post("/deployAccount", async (c) => {
    const { owner, salt } = await c.req.json()

    const predictedAddress = await publicClient.readContract({
        address: deployment.ScrappyAccountFactory,
        abi: abis.ScrappyAccountFactory,
        functionName: "getAddress",
        args: [salt],
    })

    // Check if a contract is already deployed at the predicted address
    const alreadyDeployed = await isContractDeployed(predictedAddress)
    if (alreadyDeployed) return c.json(predictedAddress, 200)

    const { request, result } = await publicClient.simulateContract({
        address: deployment.ScrappyAccountFactory,
        abi: abis.ScrappyAccountFactory,
        functionName: "createAccount",
        args: [salt, owner],
        account,
    })

    // Check if the predicted address matches the result
    if (result !== predictedAddress) throw new Error("Address mismatch during simulation")

    const hash = await walletClient.writeContract(request)
    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    // validate deployment
    if (receipt.status !== "success") throw new Error("Transaction failed on-chain.")
    if (result !== predictedAddress) throw new Error("Address mismatch during deployment")
    if (!(await isContractDeployed(predictedAddress)))
        throw new Error(`Contract deployment failed: No code found at ${predictedAddress}`)

    return c.json(predictedAddress, 200)
})

async function isContractDeployed(address: Address): Promise<boolean> {
    const code = await publicClient.getCode({ address })
    return code !== undefined && code !== "0x"
}
