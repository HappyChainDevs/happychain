import type { BasicClient } from "../types"
import { simulateSubmit } from "./simulateSubmit"
import { submit } from "./submit"
import { waitForSubmitReceipt } from "./waitForSubmitReceipt"

export type SubmitterActions = {
    simulateSubmit: (args: Parameters<typeof simulateSubmit>[1]) => ReturnType<typeof simulateSubmit>
    submit: (args: Parameters<typeof submit>[1]) => ReturnType<typeof submit>
    waitForSubmitReceipt: (args: Parameters<typeof waitForSubmitReceipt>[1]) => ReturnType<typeof waitForSubmitReceipt>
}

export function submitterActions(client: BasicClient): SubmitterActions {
    return {
        simulateSubmit: (args) => simulateSubmit(client, args),
        submit: (args) => submit(client, args),
        waitForSubmitReceipt: (args) => waitForSubmitReceipt(client, args),
    }
}
