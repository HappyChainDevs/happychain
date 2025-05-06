import type { Address } from "viem"
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

export const WalletWatchAsset = ({ method, params, reject, accept }: RequestConfirmationProps<"wallet_watchAsset">) => {
    const { type, options } = params
    return (
        <Layout
            headline={`Add $${options.symbol} to your watch list`}
            description={
                options.image && (
                    <div className="h-12 w-12 rounded-full overflow-hidden">
                        <img src={options.image} alt={options.symbol} className="object-cover size-full" />
                    </div>
                )
            }
            actions={{
                accept: {
                    children: "Watch asset",
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
                        <SubsectionTitle>Type</SubsectionTitle>
                        <FormattedDetailsLine>{type}</FormattedDetailsLine>
                    </SubsectionContent>
                    <SubsectionContent>
                        <SubsectionTitle>Contract address</SubsectionTitle>
                        <FormattedDetailsLine>
                            <LinkToAddress address={options.address as Address} />
                        </FormattedDetailsLine>
                    </SubsectionContent>
                    <SubsectionContent>
                        <SubsectionTitle>Symbol</SubsectionTitle>
                        <FormattedDetailsLine>{options.symbol}</FormattedDetailsLine>
                    </SubsectionContent>
                    <SubsectionContent>
                        <SubsectionTitle>Decimals</SubsectionTitle>
                        <FormattedDetailsLine>{options.decimals}</FormattedDetailsLine>
                    </SubsectionContent>
                </SubsectionBlock>
            </SectionBlock>
        </Layout>
    )
}
