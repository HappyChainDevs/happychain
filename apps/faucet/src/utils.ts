import type { ContentfulStatusCode } from "hono/utils/http-status"
import type { Result } from "neverthrow"
import { FaucetFetchError, HappyFaucetError } from "./errors"

type ResponseBodySuccess<TOk> = {
    success: true
    message?: string
} & TOk

type ResponseBodyError = {
    success: false
    message: string
}

type ResponseBody<TOk> = ResponseBodySuccess<TOk> | ResponseBodyError

export function makeResponse<TOk>(output: Result<TOk, unknown>): [ResponseBody<TOk>, ContentfulStatusCode] {
    if (output.isOk())
        return [
            {
                success: true,
                ...output.value,
            },
            200,
        ] as const

    if (output.error instanceof HappyFaucetError) {
        return [
            {
                success: false,
                message: output.error.message,
            },
            output.error.statusCode,
        ] as const
    }

    return [
        {
            success: false,
            message: "Unexpected error",
        },
        500,
    ] as const
}

export function mapFetchError(error: unknown): FaucetFetchError {
    if (error instanceof DOMException) {
        if (error.name === "AbortError") {
            return new FaucetFetchError("Request aborted")
        }
        if (error.name === "NotAllowedError") {
            return new FaucetFetchError("Network error")
        }
    }
    if (error instanceof TypeError) {
        return new FaucetFetchError("Request bad constructed")
    }
    if (error instanceof Error) {
        return new FaucetFetchError(error.message)
    }
    return new FaucetFetchError()
}
