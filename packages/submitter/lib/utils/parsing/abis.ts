import type { AbiError, AbiFunction } from "abitype"
import { parseAbi } from "viem/utils"

// ABIs lists, used to parse and serialize selectors and parse errors and logs.
// Functions leveraging these lists are available in ./viem.ts

export const eventsAbi = parseAbi([
    // Factories
    "event Deployed(address account, address owner)",
])

const errorSignatures = [
    // =================================================================================================================
    // From EntryPoint — simple
    "GasPriceTooHigh()",
    "InsufficientBalance()",
    "InsufficientStake()",
    "InvalidNonce()",
    "MalformedBoop()",
    "PayoutFailed()",

    // =================================================================================================================
    // From EntryPoint — data-carrying
    "ValidationReverted(bytes revertData)",
    "ValidationRejected(bytes reason)",
    "PaymentValidationReverted(bytes revertData)",
    "PaymentValidationRejected(bytes reason)",

    // =================================================================================================================
    // Account Creation
    "AlreadyDeployed()",
    "InitializeError()",

    // =================================================================================================================
    // Returned by Accounts (standard)
    "InvalidSignature()",
    "UnknownDuringSimulation()",

    // =================================================================================================================
    // Returned by HappyPaymaster (non-standard)
    "InsufficientGasBudget()",
    "SubmitterFeeTooHigh()",

    // =================================================================================================================
    // Extensions (standard)

    // returned by `validate` and `execute`, or reverting from `removeExtension` (standard)
    "ExtensionNotRegistered(address extension, uint8 extensionType)",

    // reverting from `addExtension` (standard)
    "ExtensionAlreadyRegistered(address extension, uint8 extensionType)",

    // returned by `validate` and `execute` (standard)
    "InvalidExtensionValue()",

    // =================================================================================================================
    // Specific Extensions

    // Batch Executor
    "InvalidBatchCallInfo()",

    // Session Key Validator
    "AccountPaidSessionKeyBoop()",
    "CannotRegisterSessionKeyForValidator()",
    "CannotRegisterSessionKeyForAccount()",

    // =================================================================================================================
    // Staking — not handled in the submiter

    "EarlyWithdraw()",
    "WithdrawDelayTooLong()",
    "WithdrawDelayTooShort()",

    // =================================================================================================================
    // Defined, but not handled

    // would trigger if using a Boop to call into another account/paymasters's validate/execute/validatePayment
    "NotFromEntryPoint()",

    // would trigger if using a Boop to call another's account private functions
    "NotSelfOrOwner()",
]

// ABIs used to obtain selectors and to parse revert data.
//
// Both lists are needed: Viem does not expose a function to obtain a selector with an error ABI item,
// however we need the error ABI to parse errors.

export const errorsAbi = parseAbi(errorSignatures.map((s) => `error ${s}`)) as AbiError[]
export const errorsAsFunctionsAbi = parseAbi(errorSignatures.map((s) => `function ${s}`)) as AbiFunction[]
