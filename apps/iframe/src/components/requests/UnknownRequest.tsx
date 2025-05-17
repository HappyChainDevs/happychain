import DisclosureSection from "./common/DisclosureSection"
import { FormattedDetailsLine, Layout } from "./common/Layout"
import { SectionError } from "./common/SectionError"

interface UnknownRequestProps<T = unknown> {
    method: string
    params: T
    reject: () => void
}

export const UnknownRequest = ({ method, params, reject }: UnknownRequestProps) => {
    return (
        <Layout headline={method} description="" actions={{ reject: { children: "Go back", onClick: reject } }}>
            <SectionError>This request method is unknown or isn't supported by the Happy Wallet.</SectionError>
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
