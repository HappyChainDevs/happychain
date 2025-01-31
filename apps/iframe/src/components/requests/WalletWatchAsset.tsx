import type { Address } from 'viem'
import { getAppURL } from "#src/utils/appURL"
import {
    FormattedDetailsLine,
    Layout,
    LinkToAddress,
    SectionBlock,
    SectionTitle,
    SubsectionBlock,
    SubsectionContent,
    SubsectionTitle,
} from "./common/Layout"
import type { RequestConfirmationProps } from "./props"

export const WalletWatchAsset = ({ method, params, reject, accept }: RequestConfirmationProps<"wallet_watchAsset">) => {
    const { type, options } = params
    const appURL = getAppURL()
    return (
        <Layout
            labelHeader="Watch asset"
            headline={`Add $${options.symbol} to your assets watch list`}
            description={
                <>
                    {options.image && (
                        <div className="h-12 w-12 rounded-full overflow-hidden">
                            <img src={options.image} alt={options.symbol} className="object-cover w-full h-full" />
                        </div>
                    )}
                    This will allow <span className="font-bold text-primary">{appURL}</span> to add the{" "}
                    <span className="font-bold">
                        asset <span className="text-primary">${options.symbol}</span>
                    </span>{" "}
                    to your watch list. No funds will be moved or accessed.
                </>
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
                <SectionTitle>Asset details</SectionTitle>
                <SubsectionBlock>
                    <SubsectionContent>
                        <SubsectionTitle>Type</SubsectionTitle>
                        <FormattedDetailsLine>{type}</FormattedDetailsLine>
                    </SubsectionContent>
                    <SubsectionContent>
                        <SubsectionTitle>Contract address</SubsectionTitle>
                        <FormattedDetailsLine>
                            <LinkToAddress address={options.address as Address}>{options.address}</LinkToAddress>
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
