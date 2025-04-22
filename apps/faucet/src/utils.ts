import type { Result } from "neverthrow"
import { HappyFaucetError } from "./errors"

export function makeResponse<TOk>(output: Result<TOk, unknown>) {
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
            output.error.getStatusCode(),
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
