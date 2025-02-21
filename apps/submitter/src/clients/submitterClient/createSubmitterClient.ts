import { estimateSubmitGas } from "./actions/estimateSubmitGas"
import { simulateSubmit } from "./actions/simulateSubmit"
import { submit } from "./actions/submit"
import { waitForSubmitReceipt } from "./actions/waitForSubmitReceipt"

export function createSubmitterClient() {
    return {
        /**
         * Estimates the required gas for the supplied HappyTX.
         */
        estimateSubmitGas,

        /**
         * Simulates/validates a contract interaction. This is useful for retrieving **return data**
         * and **revert reasons** of contract write functions.
         *
         * This function does not require gas to execute and _**does not**_ change the state of the
         * blockchain.
         *
         * Internally, calls viem's simulateContract passing in the happyTx to HappyEntrypoint
         * with the user account set to the zeroAddress.
         *
         * @param parameters - { entryPoint: string, tx: {@link HappyTx}, account: Account}
         * @returns The simulation result and write request.
         */
        simulateSubmit,

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
        submit,

        /**
         * Waits for the Transaction to be included onchain.
         */
        waitForSubmitReceipt,
    }
}
