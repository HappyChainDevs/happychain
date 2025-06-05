import { DisclosureSection } from "./common/DisclosureSection"
import { FormattedDetailsLine, Layout, SectionBlock, SubsectionBlock, SubsectionContent } from "./common/Layout"

interface UnknownRequestProps<T = unknown> {
    method: string
    params: T
    reject: () => void
}

export const UnknownRequest = ({ method, params, reject }: UnknownRequestProps) => {
    return (
        <Layout headline={method} description="" actions={{ reject: { children: "Go back", onClick: reject } }}>
            <SectionBlock>
                <SubsectionBlock variant="error">
                    <SubsectionContent>
                        <p>This request method is unknown or isn't supported by the Happy Wallet.</p>
                    </SubsectionContent>
                </SubsectionBlock>
            </SectionBlock>
            <DisclosureSection title="Raw Request">
                <div className="grid gap-4 p-2">
                    <FormattedDetailsLine isCode>
                        {JSON.stringify({ method, params: params ?? null }, null, 2)}
                    </FormattedDetailsLine>
                </div>
            </DisclosureSection>
        </Layout>
    )
}
