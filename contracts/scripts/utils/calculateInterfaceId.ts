import { toFunctionSelector } from "viem"

// Calculate interface ID by XORing function selectors
function calculateInterfaceId(functionSignatures: string[]): string {
    let interfaceId = 0n

    for (const signature of functionSignatures) {
        // Take first 4 bytes of keccak256
        const selector = BigInt(toFunctionSelector(signature))
        interfaceId ^= selector
    }

    return "0x" + interfaceId.toString(16).padStart(8, "0")
}

// IHappyAccount interface functions
const iHappyAccountFunctions = [
    "validate(HappyTx)",
    "execute(HappyTx)",
    "isValidSignature(bytes32,bytes)",
    "supportsInterface(bytes4)",
]

// IHappyPaymaster interface functions
const iHappyPaymasterFunctions = ["payout(HappyTx)"]

console.log("IHappyAccount interface ID:", calculateInterfaceId(iHappyAccountFunctions))
console.log("IHappyPaymaster interface ID:", calculateInterfaceId(iHappyPaymasterFunctions))
