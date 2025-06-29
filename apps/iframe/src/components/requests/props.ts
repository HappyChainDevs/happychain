import type { Msgs, PopupMsgs } from "@happy.tech/wallet-common"
import type { requestLabels } from "#src/constants/requestLabels"

type Request<TMethod extends keyof typeof requestLabels> = Extract<
    PopupMsgs[Msgs.PopupApprove]["payload"],
    { method: TMethod }
>

export interface RequestConfirmationProps<
    TMethod extends keyof typeof requestLabels,
    TRequest extends Request<TMethod> = Request<TMethod>,
> {
    method: TRequest["method"]
    params: TRequest["params"]
    reject: () => void
    accept: (request: PopupMsgs[Msgs.PopupApprove]["payload"]) => void
}
