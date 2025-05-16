import type { ContentfulStatusCode } from "hono/utils/http-status"
import type { Result } from "neverthrow"
import { HappySettingsError } from "../errors"

type ResponseBodySuccess<TOk> = {
    success: true
    message?: string
    data?: TOk
}

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
                ...(output.value !== undefined ? { data: output.value } : {}),
            },
            200,
        ] as const

    if (output.error instanceof HappySettingsError) {
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
