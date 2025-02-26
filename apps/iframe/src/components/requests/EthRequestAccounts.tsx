import { getAppURL } from "#src/utils/appURL"
import { Layout } from "./common/Layout"
import type { RequestConfirmationProps } from "./props"

export const EthRequestAccounts = ({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<"eth_requestAccounts">) => {
    const appURL = getAppURL()
    return (
        <Layout
            labelHeader="Access account info"
            headline={
                <>
                    🤠 Happy Wallet on
                    <br /> <span className="text-primary">{appURL}</span> wants to connect to your account
                </>
            }
            description={<>The app will see your wallet address and account details.</>}
            actions={{
                accept: {
                    children: "Allow",
                    onClick: () => accept({ method, params }),
                },
                reject: {
                    children: "Go back",
                    onClick: reject,
                },
            }}
        ></Layout>
    )
}
