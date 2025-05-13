import DisclosureSection from "./common/DisclosureSection"
import { FormattedDetailsLine, Layout } from "./common/Layout"

interface UnknownRequestProps<T = unknown> {
    method: string
    params: T
    reject: () => void
}

export const UnknownRequest = ({ method, params, reject }: UnknownRequestProps) => {
    return (
        <Layout
            headline={<span className="text-error italic font-mono">{method}</span>}
            description={<>This request method isn't supported by the HappyWallet.</>}
            actions={{
                reject: {
                    children: "Go back",
                    onClick: reject,
                },
            }}
        >
            <DisclosureSection title="Raw Request" isOpen>
                <div className="grid gap-4 p-2">
                    <FormattedDetailsLine isCode>
                        {JSON.stringify({ method, params: params ?? null }, null, 2)}
                    </FormattedDetailsLine>
                </div>
            </DisclosureSection>
        </Layout>
    )
}
