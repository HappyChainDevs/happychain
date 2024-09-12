import type { Transport, Account, Chain, Abi, Address } from "viem";
import type { Transaction } from "../transaction/index.js";

export type ClientConfig = {
    transport: Transport
    account: Account,
    chain: Chain
}

export type TransactionCollector = () => Transaction[]

export type Client = {
    addTransactionCollector: (t: TransactionCollector) => void
}

export function createClient(parameters?: ClientConfig): Client {
    return {
        addTransactionCollector: () => {
            console.log("CALLING addTransactionCollector")
        }
    }
}