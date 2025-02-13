import type { HappyMethodNames } from "@happy.tech/common"
import { shortenAddress } from "@happy.tech/wallet-common"
import { formatAbiItem } from "abitype"
import { useClassifyAbi } from "#src/hooks/useClassifyAbiSections"
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

export const HappyLoadAbi = ({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<typeof HappyMethodNames.LOAD_ABI>) => {
    const classifiedAbi = useClassifyAbi(params.abi)

    return (
        <Layout
            headline={<>Import contract interface</>}
            description={
                <>
                    Transactions sent to{" "}
                    <span className="font-medium text-primary">{shortenAddress(params.address)}</span> will be displayed
                    in a human-readable way.
                </>
            }
            actions={{
                accept: {
                    children: "Import ABI",
                    onClick: () => accept({ eip1193RequestParams: { method, params } }),
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
                        <SubsectionTitle>Address</SubsectionTitle>
                        <div className="grid relative">
                            <FormattedDetailsLine>
                                <LinkToAddress address={params.address}>{params.address}</LinkToAddress>
                            </FormattedDetailsLine>
                        </div>
                    </SubsectionContent>
                    {classifiedAbi.map(({ label, items }) => (
                        <SubsectionContent key={`ABI-${label}`}>
                            <SubsectionTitle>{label}</SubsectionTitle>
                            <ol className="divide-y grid divide-neutral/10 dark:divide-neutral/40 -mx-2.5 text-sm">
                                {items.map((event) => (
                                    <li className="p-2.5" key={`abi-item-${event}`}>
                                        <FormattedDetailsLine>{formatAbiItem(event)}</FormattedDetailsLine>
                                    </li>
                                ))}
                            </ol>
                        </SubsectionContent>
                    ))}
                </SubsectionBlock>
            </SectionBlock>
        </Layout>
    )
}
