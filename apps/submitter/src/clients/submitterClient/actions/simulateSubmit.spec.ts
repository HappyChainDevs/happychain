import { beforeAll, describe, expect, it } from "bun:test"
import { deployment } from "#src/deployments"
import { ValidationRevertedError } from "#src/errors"
import { getErrorNameFromSelector } from "#src/errors/parsedCodes"
import { create } from "#src/handlers/accounts/create"
import { createMockTokenAMintHappyTx, testAccount } from "#src/tests/utils"
import { encodeHappyTx } from "#src/utils/encodeHappyTx"
import { findExecutionAccount } from "#src/utils/findExecutionAccount"
import { computeHappyTxHash } from "#src/utils/getHappyTxHash"
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
        const unsigned = await createMockTokenAMintHappyTx(smartAccount, 0n, 1n)
        unsigned.executeGasLimit = gasLimit
        unsigned.gasLimit = gasLimit

        unsigned.validatorData = await testAccount.account.signMessage({
            message: { raw: computeHappyTxHash(unsigned) },
        })

        try {
            const { result } = await simulateSubmit({
                account: findExecutionAccount(),
                address: deployment.HappyEntryPoint,
                args: [encodeHappyTx(unsigned)],
            })

            // 10% off of values i got when i first tested. update as needed (if needed)
            expect(result.gas).toBeGreaterThan(100000)
            expect(result.gas).toBeLessThan(150000)
            expect(result.executeGas).toBeGreaterThan(30000)
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

        expect(
            simulateSubmit({ account, address: deployment.HappyEntryPoint, args: [encodeHappyTx(unsigned)] }),
        ).rejects.toEqual(new ValidationRevertedError("InvalidSignature"))
    })

    it("should fail on out of gas", async () => {
        const unsigned = await createMockTokenAMintHappyTx(smartAccount, 0n)
        unsigned.executeGasLimit = 1n
        unsigned.validatorData = await testAccount.account.signMessage({
            message: { raw: computeHappyTxHash(unsigned) },
        })
        expect(
            simulateSubmit({ account, address: deployment.HappyEntryPoint, args: [encodeHappyTx(unsigned)] }),
        ).rejects.toEqual(new ValidationRevertedError("Out Of Gas"))
    })
})
