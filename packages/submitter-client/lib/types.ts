import type { Prettify } from "@happy.tech/common"
import { client as clientFactory } from "@happy.tech/submitter/client"
import type { ClientResponse } from "@happy.tech/submitter/client"

// For api-extractor
export type { Prettify }

const client = clientFactory("")
export const accountApiType = client.api.v1.accounts
export const submitterApiType = client.api.v1.submitter

export type CreateAccountRoute = typeof accountApiType.create.$post
export type CreateAccountParameters = Parameters<CreateAccountRoute>[0]["json"]
export type CreateAccountResponse = Awaited<ReturnType<CreateAccountRoute>>
export type CreateAccountReturnType = CreateAccountResponse extends ClientResponse<infer U> ? U : never

export type SubmitRoute = typeof submitterApiType.submit.$post
export type SubmitParameters = Parameters<SubmitRoute>[0]["json"]
export type SubmitResponse = Awaited<ReturnType<SubmitRoute>>
export type SubmitReturnType = SubmitResponse extends ClientResponse<infer U> ? U : never

export type ExecuteRoute = typeof submitterApiType.execute.$post
export type ExecuteParameters = Parameters<ExecuteRoute>[0]["json"]
export type ExecuteResponse = Awaited<ReturnType<ExecuteRoute>>
export type ExecuteReturnType = ExecuteResponse extends ClientResponse<infer U> ? U : never

export type EstimateGasRoute = typeof submitterApiType.estimateGas.$post
export type EstimateGasParameters = Parameters<EstimateGasRoute>[0]["json"]
export type EstimateGasResponse = Awaited<ReturnType<EstimateGasRoute>>
export type EstimateGasReturnType = EstimateGasResponse extends ClientResponse<infer U> ? U : never

export const stateByHashRouteType = submitterApiType.state[":hash"]
export type StateRoute = typeof stateByHashRouteType.$get
export type StateParameters = Parameters<StateRoute>[0]["param"]
export type StateResponse = Awaited<ReturnType<StateRoute>>
export type StateReturnType = StateResponse extends ClientResponse<infer U> ? U : never

export const receiptByHashRouteType = submitterApiType.receipt[":hash"]
export type ReceiptRoute = typeof receiptByHashRouteType.$get
export type ReceiptParameters = Prettify<Parameters<ReceiptRoute>[0]["param"] & Parameters<ReceiptRoute>[0]["query"]>
export type ReceiptResponse = Awaited<ReturnType<ReceiptRoute>>
export type ReceiptReturnType = ReceiptResponse extends ClientResponse<infer U> ? U : never

export const pendingByAccountRouteType = submitterApiType.pending[":account"]
export type PendingRoute = typeof pendingByAccountRouteType.$get
export type PendingParameters = Parameters<PendingRoute>[0]["param"]
export type PendingResponse = Awaited<ReturnType<PendingRoute>>
export type PendingReturnType = PendingResponse extends ClientResponse<infer U> ? U : never
