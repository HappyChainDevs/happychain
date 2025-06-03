import { serializeBigInt } from "@happy.tech/common"
import { ArkErrors } from "arktype"
import { Simulate, type SimulateOutput, type SimulateSuccess } from "#lib/handlers/simulate/types"
import { simulateOutputValidation } from "#lib/handlers/simulate/validation"
import { CallStatus } from "../../types"
import { validateOutput, validateSerializedOutput } from "./helpers"

// Real output from the test case - onchainSuccess
const realOutput: SimulateOutput = {
    gas: 174338,
    validateGas: 25923,
    validatePaymentGas: 0,
    executeGas: 66213,
    validityUnknownDuringSimulation: false,
    paymentValidityUnknownDuringSimulation: false,
    futureNonceDuringSimulation: false,
    callStatus: 0,
    revertData: undefined,
    status: Simulate.Success,
    maxFeePerGas: 1886338380n,
    submitterFee: 0n,
    feeTooLowDuringSimulation: false,
}

/*
gas number
validateGas number
validatePaymentGas number
executeGas number
validityUnknownDuringSimulation boolean
paymentValidityUnknownDuringSimulation boolean
futureNonceDuringSimulation boolean
callStatus number
revertData undefined
status string
maxFeePerGas bigint
submitterFee bigint
feeTooLowDuringSimulation boolean
*/

const realtOutputFromTest: SimulateSuccess = {
    gas: 174338,
    validateGas: 25923,
    validatePaymentGas: 0,
    executeGas: 66213,
    validityUnknownDuringSimulation: false,
    paymentValidityUnknownDuringSimulation: false,
    futureNonceDuringSimulation: false,
    callStatus: 0,
    revertData: undefined,
    status: Simulate.Success,
    maxFeePerGas: 1886338380n,
    submitterFee: 0n,
    feeTooLowDuringSimulation: false,
}

// Same output but with serialized BigInt values
const serializedOutput = {
    gas: 174338,
    validateGas: 25923,
    validatePaymentGas: 0,
    executeGas: 66213,
    validityUnknownDuringSimulation: false,
    paymentValidityUnknownDuringSimulation: false,
    futureNonceDuringSimulation: false,
    callStatus: 0,
    revertData: undefined,
    status: Simulate.Success,
    maxFeePerGas: "1886338380",
    submitterFee: "0",
    feeTooLowDuringSimulation: false,
}

// Fixed version with description field added
const fixedOutput = {
    ...serializedOutput,
    description: "Simulation completed successfully",
}

// Test case with simulateSuccess status from the Simulate enum
const simulateSuccessCase = {
    status: Simulate.Success,
    maxFeePerGas: 1000000000n,
    submitterFee: 500000n,
    feeTooLowDuringSimulation: false,
    gas: 100000,
    validateGas: 50000,
    validatePaymentGas: 30000,
    executeGas: 20000,
    validityUnknownDuringSimulation: false,
    paymentValidityUnknownDuringSimulation: false,
    futureNonceDuringSimulation: false,
    callStatus: CallStatus.SUCCEEDED,
    description: "Simulation completed successfully", // Add description field
}

// Helper function to safely format error messages
function formatError(err: unknown): string {
    if (err instanceof ArkErrors) {
        return err.toString().substring(0, 200) + "..."
    }
    return String(err).substring(0, 200) + "..."
}

// console.log("=== Test Case 1: Real output from test (onchainSuccess) ===")
// try {
//     simulateOutputValidation(realOutput)
//     console.log("✅ Direct validation passed (unexpected):")
// } catch (err: unknown) {
//     console.error("❌ Direct validation failed (expected):", formatError(err))
// }

console.log("=== Test Case 1: With real output from test ===")
try {
    // simulateOutputValidation(realtOutputFromTest)
    validateOutput(serializeBigInt(realtOutputFromTest), simulateOutputValidation)
    console.log("✅ Direct validation passed (unexpected):")
} catch (err: unknown) {
    console.log("❌ Direct validation failed (expected):", formatError(err))
}

console.log("\n=== Test Case 2: Real output with validateSerializedOutput ===")
try {
    validateSerializedOutput(realOutput, simulateOutputValidation)
    console.log("✅ validateSerializedOutput passed (unexpected)")
} catch (err: unknown) {
    console.error("❌ validateSerializedOutput failed (expected):", formatError(err))
    console.log("\nError indicates that a description field is required but missing")
}

console.log("\n=== Test Case 3: Manually serialized output ===")
try {
    simulateOutputValidation(serializedOutput)
    console.log("✅ Validation passed (unexpected):")
} catch (err: unknown) {
    console.error("❌ Validation failed (expected):", formatError(err))
    console.log("\nError indicates that a description field is required but missing")
}

console.log("\n=== Test Case 4: Fixed output with description field ===")
try {
    simulateOutputValidation(fixedOutput)
    console.log("✅ Validation passed:")
} catch (err: unknown) {
    console.error("❌ Validation failed (unexpected):", formatError(err))
}

console.log("\n=== Test Case 5: simulateSuccess status test ===")
try {
    validateSerializedOutput(simulateSuccessCase, simulateOutputValidation)
    console.log("✅ Validation passed with simulateSuccess status")
} catch (err: unknown) {
    console.error("❌ Validation failed with simulateSuccess status:", formatError(err))
}
