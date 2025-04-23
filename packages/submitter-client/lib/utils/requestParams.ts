type RequestParamValue = string | number | boolean | undefined | null
export type RequestParams = Record<string, RequestParamValue>

type RawRequestParams = {
    query?: unknown
    body?: unknown
}

export type ProcessedRequestParams = {
    query?: RequestParams
    body?: RequestParams
}

export function processRequestParams(params: RawRequestParams): ProcessedRequestParams {
    return {
        query: toRequestParams(params.query),
        body: toRequestParams(params.body),
    }
}

function isRequestParamValue(value: unknown): value is RequestParamValue {
    return (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === undefined ||
        value === null ||
        typeof value === "object"
    )
}

function toRequestParams(input: unknown): RequestParams {
    if (typeof input !== "object" || input === null) {
        return {}
    }

    return Object.entries(input).reduce<RequestParams>((acc, [key, value]) => {
        if (isRequestParamValue(value)) acc[key] = value
        return acc
    }, {})
}
