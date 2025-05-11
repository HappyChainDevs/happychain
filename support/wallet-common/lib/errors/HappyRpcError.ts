import type { EIP1193ErrorCodes } from "./eip1193Errors"
import type { EIP1474ErrorCodes } from "./eip1474Errors"
import type { RevertErrorCode } from "./revertError"

export type HappyRpcErrorArgs = {
    code: EIP1193ErrorCodes | EIP1474ErrorCodes | typeof RevertErrorCode
    shortMessage: string
    details?: string
    ctxMessages?: string[]
    cause?: unknown
}

/**
 * Parent class of all errors that can be triggered by a call to the happy RPC provider.
 *
 * You can rely on check for the subclasses of this: {@link ProviderRpcError} and {@link EthereumRpcError}.
 *
 * Error codes are expected to belong to {@link EIP1193ErrorCodes} or {@link EIP1474ErrorCodes}
 */
export abstract class HappyRpcError extends Error {
    /** Standard RPC error code from {@link EIP1193ErrorCodes} or {@link EIP1474ErrorCodes} */
    readonly code: EIP1193ErrorCodes | EIP1474ErrorCodes | typeof RevertErrorCode

    /** Short message matching the error code. */
    readonly shortMessage: string

    /** Additional details provided when throwing the error. */
    readonly details?: string

    /**
     * This can store extra contextual information, similar to Viem's `metaMessages`.
     * We used it to include the RPC URL and the request body, just as Viem would do for its own errors.
     */
    readonly ctxMessages?: string[]

    /**
     * The thing that caused this to be thrown (or a string representation
     * of it in case the error was inflated from serialized form).
     */
    readonly cause?: unknown

    protected constructor({ code, shortMessage, details, ctxMessages, cause }: HappyRpcErrorArgs) {
        // See below for why we do it like this.
        const msg = details ? `${shortMessage}:\n${details}\n` : `${shortMessage}\n`
        super(ctxMessages ? `${msg}\n${ctxMessages.join("\n")}\n` : msg)
        this.code = code
        this.shortMessage = shortMessage
        this.details = details
        this.ctxMessages = ctxMessages
        this.cause = cause
    }

    override toString(): string {
        return this.ctxMessages ? `${this.message}\n${this.ctxMessages.join("\n")}` : this.message
    }
}

// NOTE(norswap): What we are trying to achieve is a matrix of readable error outcomes:
// [viem, ethers, raw provider call] x [standard RPC errors, custom errors]
//
// Ethers is a problem child, because it does not parse the error codes, and instead relies on parsing the raw message
// fields returned by nodes. It doesn't even do that very well, only handling a very small subset of possible errors.
//
// Therefore, we need to cram all the info in the `message` field so that it can be displayed on the console with
// Ethers, albeit in a very unfortunate manner ("Error: could not coalesce error", and encoded newlines ("\n")).
//
// Viem for its part takes our error's `message` field and displays it after "Details:". The
// newlines we add in the message formatting makes sures that this renders in a visually pleasant way.
//
// In Viem, it's also possible to populate the `metaMessages` field, which will display
// before "Details:" with newlines around it. These metaMessages are used by Viem to
// display the RPC URL and the request body (and maybe other things in some cases?).
//
// However we do need to populate the message field for Ethers, and these meta messages are actually better
// placed after the details. So we provide our own meta messages, but simply encode them into the
// message like the rest.
//
// We fill in the RPC URL and request body manually because (1) Viem somehow doesn't provide them when using
// our HappyProvider, there's probably a way to fix this, but (2) they're useful outside of Viem usage too.
//
// With Viem, there is still unavoidable duplication via the `cause` object (set to our error).
//
// Using our errors directly is easier, it will properly display the crammed message
// field properly, but its components are still available individually via {@link
// HappyRpcError.shortMessage}, {@link HappyRpcError.details} and {@link HappyRpcError.metaMessages}.
