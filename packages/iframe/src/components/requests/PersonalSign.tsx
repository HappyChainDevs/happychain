import { hexToString } from "viem"
import { requestLabels } from "../../constants/requestLabels"
import type { RequestConfirmationProps } from "./props"

export const PersonalSign = ({ method, params, reject, accept }: RequestConfirmationProps<"personal_sign">) => {
    return (
        <main className="flex h-dvh flex-col items-start justify-between gap-4 bg-base-300 p-4">
            <div className="flex w-full grow flex-col gap-4">
                <div className="w-full rounded-lg bg-base-200 p-4 font-bold">{window.location.origin}</div>
                <div className="w-full rounded-lg bg-base-200 p-4 font-bold">
                    {requestLabels[method] ?? "Unknown Signature Type"}
                </div>

                <div className="flex grow flex-col gap-4 overflow-y-auto rounded-lg bg-base-200 p-4">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col items-center gap-2">
                            <span className="text-sm text-neutral-content">Requested Text</span>
                            <pre className="grow">{hexToString(params[0])}</pre>
                        </div>

                        <details className="collapse collapse-arrow bg-base-100 items-center">
                            <summary className="collapse-title text-sm font-medium">View Transaction Details</summary>
                            <div className="collapse-content flex flex-col gap-3">
                                <pre className="grow">{JSON.stringify(params, null, 2)}</pre>
                            </div>
                        </details>
                    </div>
                </div>
            </div>

            <div className="flex w-full gap-4">
                <button
                    type="button"
                    className="btn grow border-2 border-green-300 bg-green-300 hover:bg-green-400"
                    onClick={() => accept({ method: "personal_sign", params })}
                >
                    Sign
                </button>
                <button
                    type="button"
                    className="btn border-2 border-red-300 bg-red-100 hover:border-red-100 hover:bg-red-100"
                    onClick={reject}
                >
                    Reject
                </button>
            </div>
        </main>
    )
}
