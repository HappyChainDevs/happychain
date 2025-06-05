import type { AssertCompatible, BigIntSerialized } from "@happy.tech/common"
import { arktypeValidator } from "@hono/arktype-validator"
import { type } from "arktype"
import { describeRoute } from "hono-openapi"
import { CallStatus } from "#lib/types"
import {
    AddressIn,
    Bytes,
    BytesIn,
    UInt32,
    UInt256,
    openApiContent,
    openApiContentBody,
} from "#lib/utils/validation/ark"
import { SBoopIn } from "#lib/utils/validation/boop"
import type * as types from "./types"
import { Simulate } from "./types"

const simulateInput = type({
    "+": "reject",
    entryPoint: AddressIn.optional(),
    boop: SBoopIn,
})

const entryPointOutput = type({
    gas: UInt32,
    validateGas: UInt32,
    validatePaymentGas: UInt32,
    executeGas: UInt32,
    validityUnknownDuringSimulation: type.boolean,
    paymentValidityUnknownDuringSimulation: type.boolean,
    futureNonceDuringSimulation: type.boolean,
    callStatus: type.valueOf(CallStatus),
    revertData: Bytes,
})

const simulateSuccess = type(entryPointOutput.omit("revertData"), "&", {
    status: type.unit(Simulate.Success),
    maxFeePerGas: UInt256,
    submitterFee: UInt256,
    feeTooLowDuringSimulation: "boolean",
    revertData: type.never.optional(),
    description: type.never.optional(),
})

const simulateError = type({
    status: type.valueOf(Simulate).exclude(type.unit(Simulate.Success)),
    revertData: BytesIn.optional(),
    description: type.string.configure({ example: "Invalid boop" }),
    maxFeePerGas: type.never.optional(),
    submitterFee: type.never.optional(),
    feeTooLowDuringSimulation: type.never.optional(),
})

export const simulateDescription = describeRoute({
    description: "Simulates the boop execution without committing to the blockchain",
    requestBody: {
        required: true,
        description: "Boop data to simulate",
        content: openApiContentBody(simulateInput.in),
    },
    responses: {
        200: {
            description: "Boop simulation completed successfully",
            content: openApiContent(simulateSuccess),
        },
        other: {
            description: "Boop simulation failed",
            content: openApiContent(simulateError),
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
type _a2 = AssertCompatible<SimulateSuccess, BigIntSerialized<types.SimulateSuccess>>
type _a3 = AssertCompatible<SimulateError, types.SimulateError>
type _a4 = AssertCompatible<SimulateOutput, BigIntSerialized<types.SimulateOutput>>
