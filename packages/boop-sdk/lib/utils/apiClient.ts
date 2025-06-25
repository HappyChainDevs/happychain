import { stringify } from "@happy.tech/common"
import { SubmitterError } from "@happy.tech/submitter/client"
import { type ProcessedRequestParams, processRequestParams } from "./requestParams"
import { constructUrl } from "./urls"

type HttpMethod = "GET" | "POST"

interface ApiClientOptions {
    submitterUrl?: string
}

export class ApiClient {
    submitterUrl: string

    constructor({ submitterUrl = "" }: ApiClientOptions = {}) {
        this.submitterUrl = submitterUrl
    }

    async get(endpoint: string, query: unknown = {}): Promise<unknown> {
        return await this.#request("GET", endpoint, processRequestParams({ query }))
    }

    async post(endpoint: string, body: unknown = {}, query: unknown = {}): Promise<unknown> {
        return await this.#request("POST", endpoint, processRequestParams({ body, query }))
    }

    async #request(method: HttpMethod, endpoint: string, { body, query }: ProcessedRequestParams): Promise<unknown> {
        const url = constructUrl(this.submitterUrl, endpoint, query)
        // set application/json header for POST requests only
        const hasBody = method !== "GET" && body !== undefined && body !== null
        const headers = hasBody ? { "Content-Type": "application/json" } : undefined
        const init: RequestInit = {
            method,
            headers,
            body: hasBody ? JSON.stringify(body) : null,
        }

        let response: Response | undefined
        try {
            const response = await fetch(url, init)
            return await response.json()
        } catch (error) {
            const errStr = error instanceof Error ? error.message : stringify(error)
            return {
                status: SubmitterError.ClientError,
                error: `Something unexpected happened and the results could not be parsed: ${errStr}`,
                // NOTE: This is currently not type-discoverable.
                cause: error,
                response: response,
            }
        }
    }
}
