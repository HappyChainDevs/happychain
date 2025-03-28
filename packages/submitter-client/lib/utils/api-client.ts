import { type Result, err, ok } from "./neverthrow"
import { type ProcessedRequestParams, processRequestParams } from "./requestParams"
import { constructUrl } from "./urls"

type HttpMethod = "GET" | "POST"

interface ApiClientOptions {
    baseUrl?: string
}

export class ApiClient {
    #baseUrl: string
    #headers: HeadersInit = {
        "Content-Type": "application/json",
    }

    constructor({ baseUrl = "" }: ApiClientOptions = {}) {
        this.#baseUrl = baseUrl
    }

    async get(endpoint: string, query: unknown = {}): Promise<Result<unknown, Error>> {
        return this.#request("GET", endpoint, processRequestParams({ query }))
    }

    async post(endpoint: string, body: unknown = {}, query: unknown = {}): Promise<Result<unknown, Error>> {
        return this.#request("POST", endpoint, processRequestParams({ body, query }))
    }

    async #request(
        method: HttpMethod,
        endpoint: string,
        { body, query }: ProcessedRequestParams,
    ): Promise<Result<unknown, Error>> {
        const url = constructUrl(this.#baseUrl, endpoint, query)
        const init = { method, headers: this.#headers, body: body ? JSON.stringify(body) : null }
        const response = await fetch(url, init)
        return this.#handleResponse(response)
    }

    async #handleResponse(response: Response): Promise<Result<unknown, Error>> {
        if (!response.ok) {
            const msg = `Request failed: ${response.status} ${response.statusText}`
            const error: Error & { status?: number; response?: Response } = new Error(msg)
            error.status = response.status
            error.response = response
            return err(error)
        }

        const data = await response.json()
        return ok(data)
    }
}
