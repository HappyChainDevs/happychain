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

function toRequestParams(input: unknown): RequestParams | undefined {
    if (typeof input !== "object" || input === null || !Object.keys(input).length) {
        return
    }

    return input as RequestParams
}
