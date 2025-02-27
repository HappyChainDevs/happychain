import { useMemo } from "react"
import { hexToString } from "viem"
import {
    FormattedDetailsLine,
    Layout,
    SectionBlock,
    SubsectionBlock,
    SubsectionContent,
    SubsectionTitle,
} from "./common/Layout"
import type { RequestConfirmationProps } from "./props"

export const PersonalSign = ({ method, params, reject, accept }: RequestConfirmationProps<"personal_sign">) => {
    const formattedSignPayload = useMemo(() => {
        return hexToString(params[0])
    }, [params])

    return (
        <Layout
            labelHeader="Your signature is requested."
            headline="Sign message"
            description={
                <>
                    The message will be tied to your account and may be used for authorizations. Make sure you know what
                    you are signing !
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
            <SectionBlock>
                <SubsectionBlock>
                    <SubsectionContent>
                        <SubsectionTitle>Message</SubsectionTitle>
                        <FormattedDetailsLine>{formattedSignPayload}</FormattedDetailsLine>
                    </SubsectionContent>
                </SubsectionBlock>
            </SectionBlock>
            <SectionBlock>
                <SubsectionBlock>
                    <SubsectionContent>
                        <SubsectionTitle>Data</SubsectionTitle>

                        <FormattedDetailsLine isCode>{JSON.stringify(params, null, 2)}</FormattedDetailsLine>
                    </SubsectionContent>
                </SubsectionBlock>
            </SectionBlock>
        </Layout>
    )
}
