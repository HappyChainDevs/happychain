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

    const getRequestPayload = (): EIP1193RequestParameters<typeof method> => {
        if (method === "eth_requestAccounts") {
            return { method: "eth_requestAccounts" }
        } else {
            return {
                method: "wallet_requestPermissions",
                params: params as [{ eth_accounts: Record<string, never> }],
            }
        }
    }

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
                    onClick: () => accept({ eip1193RequestParams: getRequestPayload() }),
                },
                reject: {
                    children: "Go back",
                    onClick: reject,
                },
            }}
        />
    )
}
