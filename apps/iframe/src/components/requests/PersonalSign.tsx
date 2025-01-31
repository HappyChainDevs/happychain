import { useMemo } from "react"
import { hexToString } from "viem"
import { getAppURL } from "#src/utils/appURL.ts"
import {
    FormattedDetailsLine,
    Layout,
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

export const PersonalSign = ({ method, params, reject, accept }: RequestConfirmationProps<"personal_sign">) => {
    const appURL = getAppURL()

    const formattedSignPayload = useMemo(() => {
        return hexToString(params[0])
    }, [params])

    return (
        <Layout
            labelHeader="Your signature is requested."
            headline={
                <>
                    <span className="text-primary">{appURL}</span> is requesting your signature
                </>
            }
            description={
                <>
                    This will allow <span className="font-medium text-primary">{appURL}</span> to verify your wallet
                    ownership through a signature. This won't allow any access to your funds.
                </>
            }
            actions={{
                accept: {
                    children: "Sign",
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
                        <SectionTitle>Message</SectionTitle>
                        <SubsectionBlock>
                            <SubsectionContent>
                                <SubsectionTitle>Content</SubsectionTitle>
                                <FormattedDetailsLine>{formattedSignPayload}</FormattedDetailsLine>
                            </SubsectionContent>
                        </SubsectionBlock>
                    </SectionBlock>
                </TabContent>
                <TabContent value={RequestTabsValues.Raw}>
                    <SectionBlock>
                        <SubsectionBlock>
                            <FormattedDetailsLine>{JSON.stringify(params, null, 2)}</FormattedDetailsLine>
                        </SubsectionBlock>
                    </SectionBlock>
                </TabContent>
            </Tabs>
        </Layout>
    )
}
