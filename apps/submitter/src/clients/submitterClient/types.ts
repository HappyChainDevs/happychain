import type { happyChainSepolia } from "@happy.tech/wallet-common"
import type { Account, Address, Client, HttpTransport, ParseAccount, Prettify } from "viem"
import type { SubmitterActions } from "./actions"

export type BasicClient<accountOrAddress extends Account | Address | undefined = undefined> = Client<
    HttpTransport,
    typeof happyChainSepolia,
    ParseAccount<accountOrAddress>
>

export type SubmitterClient<accountOrAddress extends Account | undefined = undefined> = Prettify<
    Client<HttpTransport, typeof happyChainSepolia, accountOrAddress, undefined, SubmitterActions<accountOrAddress>>
>
