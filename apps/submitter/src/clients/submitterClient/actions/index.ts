import type { happyChainSepolia } from "@happy.tech/wallet-common"
import type { Account, Client, HttpTransport, Prettify } from "viem"
import { estimateSubmitGas } from "./estimateSubmitGas"
import { simulateSubmit } from "./simulateSubmit"
import { submit } from "./submit"
import { waitForSubmitReceipt } from "./waitForSubmitReceipt"

export { simulateSubmit, submit, waitForSubmitReceipt }

export type SubmitterActions<account extends Account | undefined = Account | undefined> = {
    /**
     * Estimates the required gas for the supplied HappyTX.
     *
     * _WARNING: not yet implemented! returns hardcoded data_
     */
    estimateSubmitGas: (
        args: Prettify<Parameters<typeof estimateSubmitGas<account>>[1]>,
    ) => Prettify<ReturnType<typeof estimateSubmitGas>>

    /**
     * Simulates/validates a contract interaction. This is useful for retrieving **return data**
     * and **revert reasons** of contract write functions.
     *
     * This function does not require gas to execute and _**does not**_ change the state of the
     * blockchain.
     *
     * Internally, calls viem's simulateContract passing in the happyTx to HappyEntrypoint
     *
     * @param client - Client to use
     * @param parameters - { entryPoint: string, tx: {@link HappyTx}, account: Account}
     * @returns The simulation result and write request.
     */
    simulateSubmit: (
        args: Prettify<Parameters<typeof simulateSubmit<account>>[1]>,
    ) => Prettify<ReturnType<typeof simulateSubmit>>

    /**
     * Submits the happy transaction to be executed.
     *
     * Internally, uses a viem walletClient to call writeContract,  calling 'submit' on the
     * HappyEntrypoint passing in the users TX as args.
     *
     * __Warning: The `write` internally sends a transaction – it does not validate if the contract
     * write will succeed (the contract may throw an error). It is highly recommended to
     * simulate the contract write with submitterClient.simulateSubmit before you execute it.__
     *
     * @param client - Client to use
     * @param parameters - { entryPoint: string, tx: {@link HappyTx}, account: Account}
     * @returns A Transaction Hash
     */
    submit: (args: Prettify<Parameters<typeof submit<account>>[1]>) => Prettify<ReturnType<typeof submit>>

    /**
     * Waits for the Transaction to be included onchain.
     */
    waitForSubmitReceipt: (
        args: Prettify<Parameters<typeof waitForSubmitReceipt>[1]>,
    ) => Prettify<ReturnType<typeof waitForSubmitReceipt>>
}

export function submitterActions<account extends Account | undefined = Account | undefined>(
    client: Client<HttpTransport, typeof happyChainSepolia, account>,
): SubmitterActions<account> {
    return {
        estimateSubmitGas: (args) => estimateSubmitGas(client, args),
        simulateSubmit: (args) => simulateSubmit(client, args),
        submit: (args) => submit(client, args),
        waitForSubmitReceipt: (args) => waitForSubmitReceipt(client, args),
    }
}
