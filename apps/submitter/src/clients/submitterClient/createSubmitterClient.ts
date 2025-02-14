import type { happyChainSepolia } from "@happy.tech/wallet-common"
import {
    type Account,
    type Address,
    type ClientConfig,
    type HttpTransport,
    type ParseAccount,
    type Prettify,
    createClient,
} from "viem"
import { submitterActions } from "./actions"

import type { SubmitterClient } from "./types"

export type SubmitterClientConfig<
    accountOrAddress extends Account | Address | undefined = Account | Address | undefined,
> = Prettify<
    Pick<
        ClientConfig<HttpTransport, typeof happyChainSepolia, accountOrAddress>,
        "account" | "cacheTime" | "ccipRead" | "chain" | "key" | "name" | "pollingInterval" | "rpcSchema" | "transport"
    >
>

export function createSubmitterClient<accountOrAddress extends Account | Address | undefined = undefined>(
    parameters: SubmitterClientConfig<accountOrAddress>,
): SubmitterClient<ParseAccount<accountOrAddress>> {
    const { key = "submitter", name = "Submitter Client", transport } = parameters

    const client = createClient({
        ...parameters,
        key,
        name,
        transport,
        type: "submitterClient",
    })

    return client.extend(submitterActions)
}
