import type { EIP1193RequestParameters } from "@happy.tech/wallet-common"
import { getAppURL } from "#src/utils/appURL"
import { Layout } from "./common/Layout"
import type { RequestConfirmationProps } from "./props"

export const EthRequestAccounts = ({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<"eth_requestAccounts" | "wallet_requestPermissions">) => {
    const appURL = getAppURL()

    return (
        <Layout
            headline={
                <>
                    <span className="text-primary">{appURL}</span>
                    <br /> wants to connect to your account
                </>
            }
            description={<>The app will see your wallet address and account details.</>}
            actions={{
                accept: {
                    children: "Allow",
                    // biome-ignore lint/suspicious/noExplicitAny: we know the params match the method
                    onClick: () => accept({ method, params } as any),
                },
                reject: {
                    children: "Go back",
                    onClick: reject,
                },
            }}
        />
    )
}
