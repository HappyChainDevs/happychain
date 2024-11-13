import { Button } from "../primitives/button/Button"
import RequestContent from "./common/RequestContent"
import RequestLayout from "./common/RequestLayout"
import type { RequestConfirmationProps } from "./props"

export const EthRequestAccounts = ({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<"eth_requestAccounts">) => {
    return (
        <RequestLayout method={method}>
            <RequestContent>
                <div className="flex grow flex-col gap-4 overflow-x-auto bg-base-200 p-4">
                    <div className="border-b border-zinc-300 pb-2 text-center text-sm font-bold text-blue-600">
                        Allow this app to view your address?
                    </div>
                </div>
            </RequestContent>

            <div className="flex w-full gap-4">
                <Button
                    intent="primary"
                    className="grow text-neutral-content justify-center"
                    onClick={() => accept({ method, params })}
                >
                    Sign
                </Button>
                <Button intent="outline-negative" className="text-base-content" onClick={reject}>
                    Reject
                </Button>
            </div>
        </RequestLayout>
    )
}
