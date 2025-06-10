import type { AssertCompatible } from "@happy.tech/common"
import { arktypeValidator } from "@hono/arktype-validator"
import { type } from "arktype"
import { describeRoute } from "hono-openapi"
import { CallStatus } from "#lib/types"
import { Address, Bytes, UInt32, UInt256, openApiBodyContent, openApiResponseContent } from "#lib/utils/validation/ark"
import { SBoop } from "#lib/utils/validation/boop"
import type * as types from "./types"
import { Simulate } from "./types"

const simulateInput = type({
    "+": "reject",
    entryPoint: Address.optional(),
    boop: SBoop,
})

const entryPointOutput = type({
    gas: UInt32,
    validateGas: UInt32,
    validatePaymentGas: UInt32,
    executeGas: UInt32,
    validityUnknownDuringSimulation: "boolean",
    paymentValidityUnknownDuringSimulation: "boolean",
    futureNonceDuringSimulation: "boolean",
    callStatus: type.valueOf(CallStatus),
    revertData: Bytes,
})

const simulateSuccess = type(entryPointOutput.omit("revertData"), "&", {
    status: type.unit(Simulate.Success),
    maxFeePerGas: UInt256,
    submitterFee: UInt256,
    feeTooLowDuringSimulation: "boolean",
    feeTooHighDuringSimulation: "boolean",
})

const simulateError = type({
    status: type.valueOf(Simulate).exclude(type.unit(Simulate.Success)),
    revertData: Bytes.optional(),
    // Pick this example in particular because we can't select the example for `status` without making
    // the OpenAPI playground display weird (shows all options as named "example") — it will pick
    // the first value in lexicographic order as example, which happens to be Onchain.CallReverted.
    error: type.string.configure({ example: "The call made by the account's `execute` function reverted." }),
})

export const simulateDescription = describeRoute({
    description: "Simulates the boop execution without submitting it to the blockchain",
    requestBody: {
        required: true,
        description: "Boop to simulate and optional EntryPoint to simulate it with",
        content: openApiBodyContent(simulateInput.in),
    },
    responses: {
        200: {
            description: "Boop simulation completed successfully",
            content: openApiResponseContent(simulateSuccess),
        },
        other: {
            description: "Boop simulation failed",
            content: openApiResponseContent(simulateError),
        },
    },
})

export const simulateBodyValidation = arktypeValidator("json", simulateInput)
export const simulateOutputValidation = type(simulateSuccess, "|", simulateError)

type SimulateInput = typeof simulateInput.infer
type SimulateSuccess = typeof simulateSuccess.infer
type SimulateError = typeof simulateError.infer
type SimulateOutput = typeof simulateOutputValidation.infer

type _a1 = AssertCompatible<SimulateInput, types.SimulateInput>
type _a2 = AssertCompatible<SimulateSuccess, types.SimulateSuccess>
type _a3 = AssertCompatible<SimulateError, types.SimulateError>
type _a4 = AssertCompatible<SimulateOutput, types.SimulateOutput>
