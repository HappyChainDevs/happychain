import type { HappyMethodNames } from "@happy.tech/common"
import { formatAbiItem } from "abitype"
import { useClassifyAbi } from "#src/hooks/useClassifyAbiSections"
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

export function HappyUseAbi({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<typeof HappyMethodNames.USE_ABI>) {
    const classifiedAbi = useClassifyAbi(params.abi)
    const appURL = getAppURL()

    return (
        <Layout
            labelHeader="Import new ABI"
            headline={
                <>
                    <span className="text-primary">{appURL}</span> wants to import a contract interface
                </>
            }
            description={
                <>
                    This will allow <span className="font-medium text-primary">{appURL}</span> to import this ABI to
                    enable seamless interactions. An ABI defines how you can interact with a smart contract through your
                    wallet.
                </>
            }
            actions={{
                accept: {
                    children: "Import ABI",
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
                        <SectionTitle>Smart contract </SectionTitle>
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
                                    <ol className="divide-y grid divide-neutral/10 dark:divide-neutral/40 -mx-2.5">
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
                </TabContent>
                <TabContent className="break-words" value={RequestTabsValues.Raw}>
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
