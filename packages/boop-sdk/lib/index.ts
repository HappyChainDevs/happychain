export { BoopClient } from "./client"
export type { BoopClientConfig } from "./client"

export {
    type PendingBoopInput,
    type PendingBoopOutput,
    type ReceiptRequestInput,
    type ReceiptRequestOutput,
    type StateRequestInput,
    type StateRequestOutput,
    type BoopStateSubmitterError,
    type BoopStateEntryPointError,
    type BoopStateSuccess,
    type PendingBoopInfo,
    StateRequestStatus,
    type Boop,
    type BoopState,
    type BoopReceipt,
    // TODO missing stuff now
} from "@happy.tech/submitter/client"

export type {
    Address,
    Hash,
    UInt128,
    UInt16,
    UInt160,
    UInt256,
    UInt192,
    UInt64,
    UInt32,
    UInt8,
    UInt96,
    Bytes,
    Int128,
    Int16,
    Int160,
    Int192,
    Int256,
    Int32,
    Int64,
    Int8,
    Int96,
    Hex,
} from "@happy.tech/common"

export {
    //
    // Generic
    //
    type EntryPointOutput,
    Onchain,
    type OnchainStatus,
    isOnchain,
    SubmitterError,
    type SubmitterErrorStatus,
    isSubmitterError,
    //
    // CreateAccount
    //
    CreateAccount,
    type CreateAccountStatus,
    type CreateAccountInput,
    type CreateAccountOutput,
    type CreateAccountSuccess,
    type CreateAccountFailed,
    //
    // Simulate
    //
    Simulate,
    type SimulateStatus,
    type SimulateInput,
    type SimulateOutput,
    type SimulateSuccess,
    type SimulateFailed,
    type SimulateError,
    //
    // Submit
    //
    Submit,
    type SubmitStatus,
    type SubmitInput,
    type SubmitOutput,
    type SubmitSuccess,
    type SubmitSimulationFailed,
    type SubmitError,
    //
    // Execute
    //
    Execute,
    type ExecuteStatus,
    type ExecuteInput,
    type ExecuteOutput,
    type ExecuteSuccess,
    type ExecuteFailedOnchain,
    type ExecuteError,
    //
    // Ethereum Types
    //
    type Log,
    type Receipt,
    TransactionTypeName,
    //
    // Utilities
    //
    computeBoopHash,
} from "@happy.tech/submitter/client"

export type { Result, Ok, Err } from "./utils/neverthrow"
