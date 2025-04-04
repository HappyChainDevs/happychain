import { beforeAll, describe, expect, it } from "bun:test"
import type { SubmitOutput } from "#lib/client"
import env from "#lib/env"
import { create } from "#lib/handlers/accounts/create"
import { createMockTokenAMintHappyTx, getNonce, testAccount } from "#lib/tests/utils"
import { computeHappyTxHash } from "#lib/utils/computeHappyTxHash"
import { submit } from "./submit"

describe("submit", () => {
    let smartAccount: `0x${string}`

    beforeAll(async () => {
        ;({ address: smartAccount } = await create({
            owner: testAccount.address,
            salt: "0x000000000000000000000000000000000000000000000000000000000000001",
        }).then((a) => (a.isOk() ? a.value : ({} as never))))
    })

    describe("success", () => {
        it("should simulate submit with 0n gas", async () => {
            const nonceTrack = 1n
            const nonceValue = await getNonce(smartAccount, nonceTrack)
            const unsigned = await createMockTokenAMintHappyTx(smartAccount, nonceValue, nonceTrack)
            unsigned.executeGasLimit = 0n
            unsigned.gasLimit = 0n
            unsigned.validatorData = await testAccount.signMessage({
                message: { raw: computeHappyTxHash(unsigned) },
            })

            const resp = await submit({ entryPoint: env.DEPLOYMENT_ENTRYPOINT, tx: unsigned })

            // @ts-expect-error
            const { status, hash } = resp.value as SubmitOutput

            expect(status).toBe("submitSuccess")
            expect(hash).toStartWith("0x")
            expect(hash?.length).toBe(66)
            expect(BigInt(hash ?? 0)).toBeGreaterThan(0n)
        })

        it("should simulate submit with 4000000000n gas", async () => {
            const nonceTrack = 2n
            const nonceValue = await getNonce(smartAccount, nonceTrack)
            const unsigned = await createMockTokenAMintHappyTx(smartAccount, nonceValue, nonceTrack)
            unsigned.executeGasLimit = 4000000000n
            unsigned.gasLimit = 4000000000n
            unsigned.validatorData = await testAccount.signMessage({
                message: { raw: computeHappyTxHash(unsigned) },
            })

            const resp = await submit({ entryPoint: env.DEPLOYMENT_ENTRYPOINT, tx: unsigned })

            // @ts-expect-error
            const { status, hash } = resp.value as SubmitOutput

            expect(status).toBe("submitSuccess")
            expect(hash).toStartWith("0x")
            expect(hash?.length).toBe(66)
            expect(BigInt(hash ?? 0n)).toBeGreaterThan(0n)
        })
    })

    describe("failure", () => {
        it("should fail with out of range future nonce", async () => {
            const nonceTrack = 1000_000_000_000n + BigInt(Math.floor(Math.random() * 10_000_000))
            const nonceValue = 1000_000_000_000n + BigInt(Math.floor(Math.random() * 10_000_000))
            const unsigned = await createMockTokenAMintHappyTx(smartAccount, nonceValue, nonceTrack)
            unsigned.validatorData = await testAccount.signMessage({
                message: { raw: computeHappyTxHash(unsigned) },
            })

            const resp = await submit({ entryPoint: env.DEPLOYMENT_ENTRYPOINT, tx: unsigned })

            // @ts-expect-error
            const err = resp.error
            expect(err.message).toBe("nonce out of range")
        })
    })
})
