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
                    <div className="border-b border-neutral-content pb-2 text-center text-sm font-bold text-primary">
                        Allow this app to view your address?
                    </div>
                </div>
            </RequestContent>

            <div className="flex flex-col w-full gap-2">
                <Button
                    intent="primary"
                    className="text-neutral-content justify-center"
                    onClick={() => accept({ method, params })}
                >
                    Sign
                </Button>
                <Button intent="outline-negative" className="text-base-content justify-center" onClick={reject}>
                    Reject
                </Button>
            </div>
        </RequestLayout>
    )
}
