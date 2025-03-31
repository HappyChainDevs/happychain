import { beforeAll, describe, expect, it } from "bun:test"
import { deployment } from "#lib/deployments"
import { ValidationRevertedError } from "#lib/errors"
import { getErrorNameFromSelector } from "#lib/errors/parsedCodes"
import { create } from "#lib/handlers/accounts/create"
import { createMockTokenAMintHappyTx, getNonce, testAccount } from "#lib/tests/utils"
import { encodeHappyTx } from "#lib/utils/encodeHappyTx"
import { findExecutionAccount } from "#lib/utils/findExecutionAccount"
import { computeHappyTxHash } from "#lib/utils/getHappyTxHash"
import { simulateSubmit } from "./simulateSubmit"

const account = findExecutionAccount()

describe("simulateSubmit", () => {
    let smartAccount: `0x${string}`

    beforeAll(async () => {
        ;({ address: smartAccount } = await create({
            owner: testAccount.account.address,
            salt: "0x000000000000000000000000000000000000000000000000000000000000001",
        }))
    })

    it("should decode error selectors predictably", () => {
        expect(getErrorNameFromSelector("0x8baa579f")).toBe("InvalidSignature")
        expect(getErrorNameFromSelector("0x2c5ca398")).toBe("UnknownDuringSimulation")
    })

    // try with no gas, and lots of gas
    // it("should simulate submit", async (gasLimit = 0n) => {
    it.each([0n, 4000000000n])("should simulate submit", async (gasLimit) => {
        const nonceTrack = 1n
        const nonceValue = await getNonce(smartAccount, nonceTrack)
        const unsigned = await createMockTokenAMintHappyTx(smartAccount, nonceValue, nonceTrack)
        unsigned.executeGasLimit = gasLimit
        unsigned.gasLimit = gasLimit
        unsigned.validatorData = await testAccount.account.signMessage({
            message: { raw: computeHappyTxHash(unsigned) },
        })

        try {
            const { result } = await simulateSubmit(
                findExecutionAccount(),
                deployment.HappyEntryPoint,
                encodeHappyTx(unsigned),
            )

            // 10% off of values i got when i first tested. update as needed (if needed)
            expect(result.gas).toBeGreaterThan(80000)
            expect(result.gas).toBeLessThan(150000)
            expect(result.executeGas).toBeGreaterThan(15000)
            expect(result.executeGas).toBeLessThan(50000)
            expect(result.validationStatus).toBe("0x00000000")
            expect(result.callStatus).toBe(0)
            expect(result.revertData).toBe("0x")
        } catch (_err) {
            expect.unreachable()
        }
    })

    it("should fail on invalid signature", async () => {
        const unsigned = await createMockTokenAMintHappyTx(smartAccount, 0n)

        // invalid signature
        unsigned.validatorData = "0x"

        expect(simulateSubmit(account, deployment.HappyEntryPoint, encodeHappyTx(unsigned))).rejects.toEqual(
            new ValidationRevertedError("InvalidSignature"),
        )
    })

    it("should fail on out of gas", async () => {
        const unsigned = await createMockTokenAMintHappyTx(smartAccount, 0n)
        unsigned.executeGasLimit = 1n
        unsigned.gasLimit = 1n
        unsigned.validatorData = await testAccount.account.signMessage({
            message: { raw: computeHappyTxHash(unsigned) },
        })
        expect(simulateSubmit(account, deployment.HappyEntryPoint, encodeHappyTx(unsigned))).rejects.toEqual(
            new ValidationRevertedError("Out Of Gas"),
        )
    })
})
