import type { JWTLoginParams } from "@web3auth/mpc-core-kit"
import type { EIP1193Provider } from "viem"
import { connect, disconnect } from "../workers/web3auth.sw"
import { Web3ProviderProxy } from "./web3authProvider"

export const web3AuthEIP1193Provider = new Web3ProviderProxy() as EIP1193Provider

export async function web3AuthConnect(jwt: JWTLoginParams) {
    return await connect(jwt)
}

export async function web3AuthDisconnect() {
    return await disconnect()
}
