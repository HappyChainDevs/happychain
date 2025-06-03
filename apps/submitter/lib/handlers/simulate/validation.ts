import type { AssertCompatible } from "@happy.tech/common"
import { arktypeValidator } from "@hono/arktype-validator"
import { type } from "arktype"
import { describeRoute } from "hono-openapi"
import { CallStatus } from "#lib/types"
import { AddressIn, BytesIn, UInt32In, UInt256, openApiContent } from "#lib/utils/validation/ark"
import { SBoopIn } from "#lib/utils/validation/boop"
import type { SerializedObject } from "#lib/utils/validation/helpers"
import type * as types from "./types"
import { Simulate } from "./types"

const simulateInput = type({
    "+": "reject",
    entryPoint: AddressIn.optional(),
    boop: SBoopIn,
})

const entryPointOutput = type({
    gas: UInt32In,
    validateGas: UInt32In,
    validatePaymentGas: UInt32In,
    executeGas: UInt32In,
    validityUnknownDuringSimulation: type.boolean,
    paymentValidityUnknownDuringSimulation: type.boolean,
    futureNonceDuringSimulation: type.boolean,
    callStatus: type.valueOf(CallStatus).configure({ example: CallStatus.SUCCEEDED }),
    revertData: BytesIn,
})

const simulateSuccess = type(entryPointOutput.omit("revertData"), "&", {
    status: type.unit(Simulate.Success).configure({ example: Simulate.Success }),
    maxFeePerGas: UInt256,
    submitterFee: UInt256,
    feeTooLowDuringSimulation: "boolean",
    "revertData?": type.never,
    "description?": type.never,
})

const simulateError = type({
    status: type.valueOf(Simulate).exclude(type.unit(Simulate.Success)),
    revertData: BytesIn.optional(),
    description: type.string.configure({ example: "Invalid boop" }),
    "maxFeePerGas?": type.never,
    "submitterFee?": type.never,
    "feeTooLowDuringSimulation?": type.never,
})

export const simulateDescription = describeRoute({
    description: "Simulates the supplied boop",
    responses: {
        200: {
            description: "Simulation successful",
            content: openApiContent(simulateSuccess),
        },
        other: {
            description: "Simulation failed",
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
type _a2 = AssertCompatible<SimulateSuccess, SerializedObject<types.SimulateSuccess>>
type _a3 = AssertCompatible<SimulateError, types.SimulateError>
type _a4 = AssertCompatible<SimulateOutput, SerializedObject<types.SimulateOutput>>
