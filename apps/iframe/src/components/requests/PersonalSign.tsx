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
            headline="Sign message"
            description={
                <p className="mb-4">
                    <p className="mb-2">The signature may be used for authorizations.</p>
                    <p>Make sure you know what you are signing !</p>
                </p>
            }
            actions={{
                accept: {
                    children: "Sign",
                    onClick: () => accept({ eip1193params: { method, params } }),
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
                        <SubsectionTitle>Raw Message</SubsectionTitle>
                        <div style={{ overflowWrap: "anywhere", maxWidth: "100%" }}>
                            <FormattedDetailsLine>{params[0]}</FormattedDetailsLine>
                        </div>
                    </SubsectionContent>
                </SubsectionBlock>
            </SectionBlock>
        </Layout>
    )
}
