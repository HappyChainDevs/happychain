import type { happyChainSepolia } from "@happy.tech/wallet-common"
import type { Client, HttpTransport, Prettify, PrivateKeyAccount } from "viem"
import type { SubmitterActions } from "./actions"

export type BasicClient = Client<HttpTransport, typeof happyChainSepolia, PrivateKeyAccount>

export type SubmitterClient = Prettify<
    Client<HttpTransport, typeof happyChainSepolia, PrivateKeyAccount, undefined, SubmitterActions>
>
