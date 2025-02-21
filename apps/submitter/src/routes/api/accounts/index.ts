import type { Hex } from "@happy.tech/common"
import { Hono } from "hono"
import { http, type Address, createPublicClient, createWalletClient } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { chain } from "#src/clients"
import { abis, deployment } from "#src/deployments"
import env from "#src/env"

// Account responsible for deploying ScrappyAccounts
const account = privateKeyToAccount(env.PRIVATE_KEY_ACCOUNT_DEPLOYER)
const publicClient = createPublicClient({ chain, transport: http() })
const walletClient = createWalletClient({ chain, transport: http(), account })

async function getValidAddress({ salt, owner }: { salt: Hex; owner: Hex }) {
    let _salt = salt
    for (let i = 0; i < 10; i++) {
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

export default new Hono().post("/create", async (c) => {
    const data = await c.req.json()

    const validAccount = await getValidAddress(data)

    // Check if a contract is already deployed at the predicted address
    const alreadyDeployed = await isContractDeployed(validAccount.address)
    if (alreadyDeployed) return c.json(validAccount, 200)

    const { request, result } = await publicClient.simulateContract({
        address: deployment.ScrappyAccountFactory,
        abi: abis.ScrappyAccountFactory,
        functionName: "createAccount",
        args: [validAccount.salt, validAccount.owner],
        account,
    })

    // Check if the predicted address matches the result
    if (result !== validAccount.address) throw new Error("Address mismatch during simulation")

    const hash = await walletClient.writeContract(request)
    const receipt = await publicClient.waitForTransactionReceipt({ hash })

    // validate deployment
    if (receipt.status !== "success") throw new Error("Transaction failed on-chain.")
    if (!(await isContractDeployed(validAccount.address)))
        throw new Error(`Contract deployment failed: No code found at ${validAccount.address}`)

    return c.json(validAccount, 200)
})

async function isContractDeployed(address: Address): Promise<boolean> {
    const code = await publicClient.getCode({ address })
    return code !== undefined && code !== "0x"
}
