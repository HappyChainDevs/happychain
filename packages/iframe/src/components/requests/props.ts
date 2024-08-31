import type { EIP1193ProxiedEvents } from "@happychain/sdk-shared"
import type { requestLabels } from "../../constants/requestLabels"

type Request<TMethod extends keyof typeof requestLabels> = Extract<
    EIP1193ProxiedEvents["request:approve"]["payload"],
    { method: TMethod }
>

export interface RequestConfirmationProps<
    TMethod extends keyof typeof requestLabels,
    TRequest extends Request<TMethod> = Request<TMethod>,
> {
    method: TRequest["method"]
    params: TRequest["params"]
    reject: () => void
    accept: ({ method, params }: TRequest) => void
}
