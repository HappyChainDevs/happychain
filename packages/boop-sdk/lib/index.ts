export { BoopClient } from "./client"
export type { BoopClientConfig, SimulateClientInput, SubmitClientInput, ExecuteClientInput } from "./client"

export { ExtensionType, encodeExtraData, ExtraDataKey, type ExtraData } from "./boops"

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
    type Boop,
    type BoopWithOptionalFields,
    type BoopReceipt,
    type BoopLog,
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
    type CreateAccountError,
    //
    // Simulate
    //
    Simulate,
    type SimulateStatus,
    type SimulateInput,
    type SimulateOutput,
    type SimulateSuccess,
    type SimulateError,
    //
    // Submit
    //
    Submit,
    type SubmitStatus,
    type SubmitInput,
    type SubmitOutput,
    type SubmitSuccess,
    type SubmitError,
    //
    // Execute
    //
    Execute,
    type ExecuteStatus,
    type ExecuteInput,
    type ExecuteOutput,
    type ExecuteSuccess,
    type ExecuteError,
    //
    // GetState
    //
    GetState,
    type GetStateStatus,
    type GetStateInput,
    type GetStateOutput,
    type GetStateReceipt,
    type GetStateSimulated,
    type GetStateError,
    //
    // WaitForReceipt
    //
    WaitForReceipt,
    type WaitForReceiptInput,
    type WaitForReceiptOutput,
    type WaitForReceiptSuccess,
    type WaitForReceiptError,
    //
    // GetPending
    //
    GetPending,
    type GetPendingStatus,
    type GetPendingInput,
    type GetPendingOutput,
    type GetPendingSuccess,
    type GetPendingError,
    type PendingBoopInfo,
    //
    // Utilities
    //
    computeBoopHash,
    decodeBoop,
    encodeBoop,
    updateBoopFromSimulation,
} from "@happy.tech/submitter/client"

export {
    GetNonce,
    type GetNonceError,
    type GetNonceInput,
    type GetNonceOutput,
    type GetNonceStatus,
    type GetNonceSuccess,
} from "./types/GetNonce"
