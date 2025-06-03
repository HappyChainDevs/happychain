import { ArkErrors } from "arktype"
import { Simulate, type SimulateOutput } from "#lib/handlers/simulate/types"
import { simulateOutputValidation } from "#lib/handlers/simulate/validation"
import { type SerializedObject, validateOutput, validateSerializedOutput } from "#lib/utils/validation/helpers"

/**
 * Helper function to safely format error messages
 */
function formatError(err: unknown): string {
    if (err instanceof ArkErrors) {
        return err.toString().substring(0, 200) + "..."
    }
    return String(err).substring(0, 200) + "..."
}

/**
 * Run the validation tests for simulate output
 */
async function run() {
    // Test case 1: Basic SimulateSuccess object with BigInt values
    const simulateSuccessCase: SimulateOutput = {
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

    const serializedSimulateOutput: SerializedObject<SimulateOutput> = {
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

    // Test case 2: SimulateError object
    const simulateErrorCase: SimulateOutput = {
        status: Simulate.CallReverted,
        description: "simulation failed description string",
        revertData: "0x1234",
    }

    // Run tests for validateOutput with success case
    console.log("\n=== TEST 1a: Simulate Success ===")
    try {
        const result = validateOutput(simulateSuccessCase, simulateOutputValidation)
        console.log("✅ Direct validation passed:", typeof result)
    } catch (err) {
        console.error("❌ Direct validation failed:", formatError(err))
    }

    // Run tests for validateSerializedOutput with success case
    console.log("\n=== TEST 1b: Simulate Success Serialized ===")
    try {
        // validateSerializedOutput(simulateSuccessCase, simulateOutputValidation)
        validateOutput(serializedSimulateOutput, simulateOutputValidation)
        console.log("✅ validateSerializedOutput passed")
    } catch (err) {
        console.error("❌ validateSerializedOutput failed:", formatError(err))
    }

    // Run tests for validateOutput with error case
    console.log("\n=== TEST 2a: Simulate Error ===")
    try {
        validateOutput(simulateErrorCase, simulateOutputValidation)
        console.log("✅ validateOutput passed")
    } catch (err) {
        console.error("❌ validateOutput failed:", formatError(err))
    }

    // Run tests for validateSerializedOutput with error case
    console.log("\n=== TEST 2b: Simulate Error Serialized ===")
    try {
        validateSerializedOutput(simulateErrorCase, simulateOutputValidation)
        console.log("✅ validateSerializedOutput passed")
    } catch (err) {
        console.error("❌ validateSerializedOutput failed:", formatError(err))
    }
}

// Execute the test function
await run()
console.log("\n=== TEST COMPLETE ===")
process.exit(0)
