import { beforeAll, describe, expect, it } from "bun:test"
import { deployment } from "#lib/deployments"
import { SimulationError } from "#lib/errors/contract-errors"
import { create } from "#lib/handlers/accounts/create"
import { createMockTokenAMintHappyTx, getNonce, testAccount } from "#lib/tests/utils"
import { EntryPointStatus, SimulatedValidationStatus } from "#lib/tmp/interface/status"
import { computeHappyTxHash } from "#lib/utils/computeHappyTxHash"
import { encodeHappyTx } from "#lib/utils/encodeHappyTx"
import { findExecutionAccount } from "#lib/utils/findExecutionAccount"
import { estimateSubmitGas } from "./estimateSubmitGas"

describe("estimateSubmitGas", () => {
    let smartAccount: `0x${string}`

    beforeAll(async () => {
        ;({ address: smartAccount } = await create({
            owner: testAccount.account.address,
            salt: "0x000000000000000000000000000000000000000000000000000000000000001",
        }))
    })

    it("should estimate gas with 0n gas", async () => {
        const nonceTrack = 1n
        const nonceValue = await getNonce(smartAccount, nonceTrack)
        const unsigned = await createMockTokenAMintHappyTx(smartAccount, nonceValue, nonceTrack)
        unsigned.executeGasLimit = 0n
        unsigned.gasLimit = 0n
        unsigned.validatorData = await testAccount.account.signMessage({
            message: { raw: computeHappyTxHash(unsigned) },
        })

        const result = await estimateSubmitGas({
            account: findExecutionAccount(unsigned),
            address: deployment.HappyEntryPoint,
            args: [encodeHappyTx(unsigned)],
        })

        expect(result.executeGasLimit).toBeGreaterThan(10_000n)
        expect(result.executeGasLimit).toBeLessThan(100_000n)
        expect(result.gasLimit).toBeGreaterThan(50_000n)
        expect(result.gasLimit).toBeLessThan(1_000_000n)
        expect(result.maxFeePerGas).toBeGreaterThan(1_000_000_000n)
        expect(result.maxFeePerGas).toBeLessThan(1_500_000_000n)
        expect(result.submitterFee).toBeGreaterThan(0n)
        expect(result.submitterFee).toBeLessThan(500n)
    })

    it("should estimate gas with 4000000000n gas", async () => {
        const nonceTrack = 2n
        const nonceValue = await getNonce(smartAccount, nonceTrack)
        const unsigned = await createMockTokenAMintHappyTx(smartAccount, nonceValue, nonceTrack)
        unsigned.executeGasLimit = 4000000000n
        unsigned.gasLimit = 4000000000n
        unsigned.validatorData = await testAccount.account.signMessage({
            message: { raw: computeHappyTxHash(unsigned) },
        })

        const result = await estimateSubmitGas({
            account: findExecutionAccount(unsigned),
            address: deployment.HappyEntryPoint,
            args: [encodeHappyTx(unsigned)],
        })

        expect(result.executeGasLimit).toBeGreaterThan(10_000n)
        expect(result.executeGasLimit).toBeLessThan(100_000n)
        expect(result.gasLimit).toBeGreaterThan(50_000n)
        expect(result.gasLimit).toBeLessThan(1_000_000n)
        expect(result.maxFeePerGas).toBeGreaterThan(1_000_000_000n)
        expect(result.maxFeePerGas).toBeLessThan(1_500_000_000n)
        expect(result.submitterFee).toBeGreaterThan(0n)
        expect(result.submitterFee).toBeLessThan(500n)
    })

    it("should fail with unrealistic low gas value", async () => {
        const nonceTrack = 2n
        const nonceValue = await getNonce(smartAccount, nonceTrack)
        const unsigned = await createMockTokenAMintHappyTx(smartAccount, nonceValue, nonceTrack)
        unsigned.executeGasLimit = 1n
        unsigned.gasLimit = 1n
        unsigned.validatorData = await testAccount.account.signMessage({
            message: { raw: computeHappyTxHash(unsigned) },
        })

        try {
            await estimateSubmitGas({
                account: findExecutionAccount(unsigned),
                address: deployment.HappyEntryPoint,
                args: [encodeHappyTx(unsigned)],
            })
            expect.unreachable()
            // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        } catch (err: any) {
            expect(err).toBeInstanceOf(SimulationError)
            expect(err.errorName).toBe("Revert")
            expect(err.entryPoint).toBe(deployment.HappyEntryPoint)
            expect(err.validationStatus).toBe(SimulatedValidationStatus.Success)
            expect(err.status).toBe(EntryPointStatus.ExecuteReverted)
        }
    })
})
