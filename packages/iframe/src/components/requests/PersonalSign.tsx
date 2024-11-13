import { useMemo } from "react"
import { hexToString } from "viem"
import { Button } from "../primitives/button/Button"
import RawRequestDetails from "./common/RawRequestDetails"
import RequestContent from "./common/RequestContent"
import RequestLayout from "./common/RequestLayout"
import type { RequestConfirmationProps } from "./props"

export const PersonalSign = ({ method, params, reject, accept }: RequestConfirmationProps<"personal_sign">) => {
    const formattedSignPayload = useMemo(() => {
        return hexToString(params[0])
    }, [params])

    return (
        <RequestLayout method={method}>
            <RequestContent>
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col items-center gap-2">
                        <span className="text-sm text-neutral-content">Requested Text</span>
                        <pre className="grow">{formattedSignPayload}</pre>
                    </div>

                    <RawRequestDetails params={params} />
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
