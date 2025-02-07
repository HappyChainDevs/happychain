import type { happyChainSepolia } from "@happy.tech/wallet-common"
import {
    type ClientConfig,
    type HttpTransport,
    type Prettify,
    type PrivateKeyAccount,
    createClient,
    rpcSchema,
} from "viem"
import { submitterActions } from "./actions"
import type { CustomRpcSchema } from "./rpcSchema"
import type { SubmitterClient } from "./types"

export type SubmitterClientConfig = Prettify<
    Pick<
        ClientConfig<HttpTransport, typeof happyChainSepolia, PrivateKeyAccount, CustomRpcSchema>,
        "account" | "cacheTime" | "ccipRead" | "chain" | "key" | "name" | "pollingInterval" | "rpcSchema" | "transport"
    >
>

export function createSubmitterClient(parameters: SubmitterClientConfig): SubmitterClient {
    const { key = "submitter", name = "Submitter Client", transport } = parameters

    const client = createClient({
        ...parameters,
        key,
        name,
        transport,
        rpcSchema: rpcSchema<CustomRpcSchema>(),
        type: "submitterClient",
    })

    return client.extend(submitterActions)
}
