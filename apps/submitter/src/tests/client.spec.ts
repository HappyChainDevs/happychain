import { beforeAll, describe, expect, it } from "bun:test"
import { testClient } from "hono/testing"
import { encodeFunctionData, zeroAddress } from "viem"
import { abis, deployment } from "#src/deployments"
import { app } from "#src/server"
import { computeHappyTxHash } from "#src/utils/getHappyTxHash"
import { getNonce, testWalletClient } from "./utils"

const submitterRpcClient = testClient(app)

// @ts-ignore
async function prepareTx(client, nonce, smartAccount, { address, abi, functionName, args }) {
    const rawTx = {
        // TODO: properly get the account
        account: smartAccount,
        dest: address,
        nonceTrack: 0n, // using as default
        nonceValue: nonce,
        value: 0n,

        // paymaster is default
        paymaster: zeroAddress,
        executeGasLimit: 0n,
        gasLimit: 0n,
        maxFeePerGas: 0n,
        submitterFee: 0n,

        // Encode call Data here
        callData: encodeFunctionData({ abi, functionName, args }),

        // Intentionally left blank
        paymasterData: "0x" as const,
        validatorData: "0x" as `0x${string}`,
        extraData: "0x" as const,
    }

    return {
        ...rawTx,

        // Sign validatorData
        validatorData: await client.signMessage({
            account: client.account, // local signer
            message: { raw: computeHappyTxHash(rawTx) },
        }),
        value: `0x${rawTx.value.toString(16)}`,
        nonceTrack: `0x${rawTx.nonceTrack.toString(16)}`,
        nonceValue: `0x${rawTx.nonceValue.toString(16)}`,
        gasLimit: `0x${rawTx.gasLimit.toString(16)}`,
        executeGasLimit: `0x${rawTx.executeGasLimit.toString(16)}`,
        maxFeePerGas: `0x${rawTx.maxFeePerGas.toString(16)}`,
        submitterFee: `0x${rawTx.submitterFee.toString(16)}`,
    }
}

const customWalletClient = testWalletClient.extend((client) => {
    let account: `0x${string}`
    return {
        submitHappyTx: async ({
            address,
            abi,
            functionName,
            args,
            // biome-ignore lint/suspicious/noExplicitAny: wip
        }: { address: `0x${string}`; abi: any; functionName: string; args: any }) => {
            const nonce = await getNonce(account)
            const tx = await prepareTx(client, nonce, account, { address, abi, functionName, args })
            return await submitterRpcClient.api.v1.submitter.submit.$post({ json: { tx } }).then((a) => a.json())
        },
        executeHappyTx: async ({
            address,
            abi,
            functionName,
            args,
            // biome-ignore lint/suspicious/noExplicitAny: wip
        }: { address: `0x${string}`; abi: any; functionName: string; args: any }) => {
            const nonce = await getNonce(account)
            const tx = await prepareTx(client, nonce, account, { address, abi, functionName, args })
            return await submitterRpcClient.api.v1.submitter.execute.$post({ json: { tx } }).then((a) => a.json())
        },

        async getSmartAccount() {
            account = await submitterRpcClient.api.v1.accounts.create
                .$post({ json: { owner: client.account.address, salt: "0x1" } })
                .then((a) => a.json())
                .then((a) => a.address)

            return account
        },
    }
})
describe("client", () => {
    let smartAccount: `0x${string}`

    beforeAll(async () => {
        smartAccount = await customWalletClient.getSmartAccount()
    })

    describe("viem actions", () => {
        it("Submits a happy tx", async () => {
            const submitResponse = await customWalletClient.submitHappyTx({
                address: deployment.MockTokenA,
                abi: abis.MockTokenA,
                functionName: "mint",
                args: [smartAccount, 10n ** 18n],
            })

            expect(submitResponse.status).toBe("submitSuccess")

            // @ts-expect-error
            expect(submitResponse.hash).toBeString()
        })

        // TODO: this fails if the above is tested at the same time due to nonce detection collision
        it("Executes a happy tx", async () => {
            const executeResponse = await customWalletClient.executeHappyTx({
                address: deployment.MockTokenA,
                abi: abis.MockTokenA,
                functionName: "mint",
                args: [smartAccount, 10n ** 18n],
            })

            expect(executeResponse.status).toBe("executeSuccess")
            // @ts-expect-error
            expect(executeResponse.state.status).toBe("entrypointSuccess")
        })
    })
})
