import { Button } from "../primitives/button/Button"
import RawRequestDetails from "./common/RawRequestDetails"
import RequestContent from "./common/RequestContent"
import RequestLayout from "./common/RequestLayout"
import type { RequestConfirmationProps } from "./props"

export const WalletRequestPermissions = ({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<"wallet_requestPermissions">) => {
    return (
        <RequestLayout method={method}>
            <RequestContent>
                <ul>
                    {params.map((param) => {
                        const [[name]] = Object.entries(param)
                        return (
                            <li className="italic font-mono" key={name}>
                                {name}
                            </li>
                        )
                    })}
                </ul>

                <RawRequestDetails params={params} />
            </RequestContent>

            <div className="flex flex-col w-full gap-4">
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
