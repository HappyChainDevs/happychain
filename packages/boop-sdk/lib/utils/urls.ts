import type { RequestParams } from "./requestParams"

export function constructUrl(baseUrl: string, endpoint: string, query: RequestParams = {}): URL {
    const url = normalizeUrl(baseUrl, endpoint)
    appendQueryParams(url, query)
    return url
}

function normalizeUrl(baseUrl: string, endpoint: string): URL {
    return new URL(
        endpoint.startsWith("/") ? endpoint.slice(1) : endpoint,
        baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`,
    )
}

function appendQueryParams(url: URL, params: RequestParams): void {
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            url.searchParams.append(key, String(value))
        }
    })
}
