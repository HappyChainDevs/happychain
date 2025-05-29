import { formatEther } from "viem"
import { getAppURL } from "#src/utils/appURL"
import DisclosureSection from "./common/DisclosureSection"
import {
    FormattedDetailsLine,
    Layout,
    LinkToAddress,
    SectionBlock,
    SubsectionBlock,
    SubsectionContent,
    SubsectionTitle,
} from "./common/Layout"
import type { RequestConfirmationProps } from "./props"

export function getFirstParam<T>(params: [T, ...unknown[]] | undefined): T | undefined {
    return Array.isArray(params) ? params[0] : undefined
}

export const WalletSendCalls = ({ method, params, reject, accept }: RequestConfirmationProps<"wallet_sendCalls">) => {
    const appURL = getAppURL()
    const request = getFirstParam(params)

    if (!request) return null
    const call = request.calls[0]

    const rawValue = call.value ? BigInt(call.value) : 0n
    const formattedValue = rawValue > 0n ? `${formatEther(rawValue)} HAPPY` : null

    return (
        <Layout
            headline={
                <>
                    <span className="text-primary">{appURL}</span>
                    <br /> is requesting to send a transaction
                </>
            }
            description={<>This app wants to execute a transaction on your behalf.</>}
            actions={{
                accept: {
                    children: "Approve Transaction",
                    // biome-ignore lint/suspicious/noExplicitAny: we know the params match the method
                    onClick: () => accept({ method, params } as any),
                },
                reject: {
                    children: "Go back",
                    onClick: reject,
                },
            }}
        >
            <SectionBlock>
                <SubsectionBlock>
                    {call.to && (
                        <SubsectionContent>
                            <SubsectionTitle>Receiver address</SubsectionTitle>
                            <FormattedDetailsLine>
                                <LinkToAddress address={call.to}>{call.to}</LinkToAddress>
                            </FormattedDetailsLine>
                        </SubsectionContent>
                    )}

                    {rawValue > 0n && (
                        <SubsectionContent>
                            <SubsectionTitle>Sending amount</SubsectionTitle>
                            <FormattedDetailsLine>{formattedValue}</FormattedDetailsLine>
                        </SubsectionContent>
                    )}
                </SubsectionBlock>
            </SectionBlock>

            <DisclosureSection title="Raw Request">
                <div className="grid gap-4 p-2">
                    <FormattedDetailsLine isCode>{JSON.stringify(params, null, 2)}</FormattedDetailsLine>
                </div>
            </DisclosureSection>
        </Layout>
    )
}
