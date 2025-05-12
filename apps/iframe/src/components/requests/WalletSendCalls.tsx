import { getAppURL } from "#src/utils/appURL"
import DisclosureSection from "./common/DisclosureSection"
import { FormattedDetailsLine, Layout } from "./common/Layout"
import type { RequestConfirmationProps } from "./props"

export const WalletSendCalls = ({ method, params, reject, accept }: RequestConfirmationProps<"wallet_sendCalls">) => {
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
        >
            <DisclosureSection title="Raw Request">
                <div className="grid gap-4 p-2">
                    <FormattedDetailsLine isCode>{JSON.stringify(params, null, 2)}</FormattedDetailsLine>
                </div>
            </DisclosureSection>
        </Layout>
    )
}
