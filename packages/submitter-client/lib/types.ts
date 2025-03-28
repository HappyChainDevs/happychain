import type { Prettify } from "@happy.tech/common"
import { clientFactory } from "@happy.tech/submitter/client"
import type { ClientResponse } from "@happy.tech/submitter/client"

export type { Prettify }

export const clientType: ReturnType<typeof clientFactory> = clientFactory("")
export type accountApiType = typeof clientType.api.v1.accounts
export type submitterApiType = typeof clientType.api.v1.submitter

export type CreateAccountRoute = accountApiType["create"]["$post"]
export type CreateAccountParameters = Parameters<CreateAccountRoute>[0]["json"]
export type CreateAccountResponse = Awaited<ReturnType<CreateAccountRoute>>
export type CreateAccountReturnType = CreateAccountResponse extends ClientResponse<infer U> ? U : never

export type SubmitRoute = submitterApiType["submit"]["$post"]
export type SubmitParameters = Parameters<SubmitRoute>[0]["json"]
export type SubmitResponse = Awaited<ReturnType<SubmitRoute>>
export type SubmitReturnType = SubmitResponse extends ClientResponse<infer U> ? U : never

export type ExecuteRoute = submitterApiType["execute"]["$post"]
export type ExecuteParameters = Parameters<ExecuteRoute>[0]["json"]
export type ExecuteResponse = Awaited<ReturnType<ExecuteRoute>>
export type ExecuteReturnType = ExecuteResponse extends ClientResponse<infer U> ? U : never

export type EstimateGasRoute = submitterApiType["estimateGas"]["$post"]
export type EstimateGasParameters = Parameters<EstimateGasRoute>[0]["json"]
export type EstimateGasResponse = Awaited<ReturnType<EstimateGasRoute>>
export type EstimateGasReturnType = EstimateGasResponse extends ClientResponse<infer U> ? U : never

export type StateRoute = submitterApiType["state"][":hash"]["$get"]
export type StateParameters = Parameters<StateRoute>[0]["param"]
export type StateResponse = Awaited<ReturnType<StateRoute>>
export type StateReturnType = StateResponse extends ClientResponse<infer U> ? U : never

export type ReceiptRoute = submitterApiType["receipt"][":hash"]["$get"]
export type ReceiptParameters = Prettify<Parameters<ReceiptRoute>[0]["param"] & Parameters<ReceiptRoute>[0]["query"]>
export type ReceiptResponse = Awaited<ReturnType<ReceiptRoute>>
export type ReceiptReturnType = ReceiptResponse extends ClientResponse<infer U> ? U : never

export type PendingRoute = submitterApiType["pending"][":account"]["$get"]
export type PendingParameters = Parameters<PendingRoute>[0]["param"]
export type PendingResponse = Awaited<ReturnType<PendingRoute>>
export type PendingReturnType = PendingResponse extends ClientResponse<infer U> ? U : never
