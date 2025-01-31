import type { Address } from "viem"
import { getAppURL } from "#src/utils/appURL"
import {
    FormattedDetailsLine,
    Layout,
    LinkToAddress,
    RequestTabsValues,
    SectionBlock,
    SectionTitle,
    SubsectionBlock,
    SubsectionContent,
    SubsectionTitle,
    TabContent,
    Tabs,
} from "./common/Layout"
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
                    <span className="text-primary">{appURL}</span> would like to connect to your account
                </>
            }
            description={
                <>
                    This will allow <span className="font-medium text-primary">{appURL}</span> to see your wallet
                    address and account details. No transactions can be made without your approval.
                </>
            }
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
        >
            <Tabs defaultValue={RequestTabsValues.Details}>
                <TabContent value={RequestTabsValues.Details}>
                    <SectionBlock>
                        <SectionTitle>Account</SectionTitle>
                        <SubsectionBlock>
                            <SubsectionContent>
                                <SubsectionTitle>Address</SubsectionTitle>

                                <FormattedDetailsLine>
                                    <LinkToAddress address={params as unknown as Address}>{params}</LinkToAddress>
                                    {params}
                                </FormattedDetailsLine>
                            </SubsectionContent>
                        </SubsectionBlock>
                    </SectionBlock>
                </TabContent>
                <TabContent className="break-words" value={RequestTabsValues.Raw}>
                    <SectionBlock>
                        <SubsectionBlock>
                            <FormattedDetailsLine>{JSON.stringify(params, null, 2)}</FormattedDetailsLine>
                        </SubsectionBlock>
                    </SectionBlock>
                </TabContent>
            </Tabs>
            <SectionBlock>
                <p className="font-bold pb-8 text-center text-sm">
                    You can revoke granted permissions from your wallet whenever you want.
                </p>
            </SectionBlock>
        </Layout>
    )
}
