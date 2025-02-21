import type { happyChainSepolia } from "@happy.tech/wallet-common"
import type { Account, Client, HttpTransport } from "viem"
import { estimateSubmitGas } from "./estimateSubmitGas"
import { simulateSubmit } from "./simulateSubmit"
import { submit } from "./submit"
import { waitForSubmitReceipt } from "./waitForSubmitReceipt"

export { simulateSubmit, submit, waitForSubmitReceipt }

export type SubmitterActions<account extends Account | undefined = Account | undefined> = {
    estimateSubmitGas: (args: Parameters<typeof estimateSubmitGas<account>>[1]) => ReturnType<typeof estimateSubmitGas>
    simulateSubmit: (args: Parameters<typeof simulateSubmit<account>>[1]) => ReturnType<typeof simulateSubmit>
    submit: (args: Parameters<typeof submit<account>>[1]) => ReturnType<typeof submit>
    waitForSubmitReceipt: (args: Parameters<typeof waitForSubmitReceipt>[1]) => ReturnType<typeof waitForSubmitReceipt>
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
