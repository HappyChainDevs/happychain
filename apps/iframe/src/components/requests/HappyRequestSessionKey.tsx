import type { HappyMethodNames } from "@happy.tech/common"
import { shortenAddress } from "@happy.tech/wallet-common"
import { useQuery } from "@tanstack/react-query"
import { useAtomValue } from "jotai"
import { type Address, isAddress } from "viem"
import { currentChainAtom } from "#src/state/chains"
import { publicClientAtom } from "#src/state/publicClient"
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

const KEY_QUERY_GET_BYTECODE = "get-bytecode"
export function getKeyQueryGetBytecode(targetAddress: Address) {
    return [KEY_QUERY_GET_BYTECODE, targetAddress]
}
export const HappyRequestSessionKey = ({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<typeof HappyMethodNames.REQUEST_SESSION_KEY>) => {
    const targetAddress: Address = params[0]
    const publicClient = useAtomValue(publicClientAtom)
    const currentChain = useAtomValue(currentChainAtom)
    const blockExplorerUrl = currentChain.blockExplorerUrls ? currentChain.blockExplorerUrls[0] : ""
    const appURL = getAppURL()

    const queryBytecode = useQuery({
        queryKey: getKeyQueryGetBytecode(targetAddress),
        queryFn: async () => {
            return await publicClient.getCode({ address: targetAddress })
        },
        enabled: isAddress(targetAddress),
    })

    return (
        <Layout
            labelHeader="Enable automatic approvals"
            headline={
                <>
                    <span className="text-primary">{appURL}</span> would like your permission to automatically approve
                    transactions for contract {shortenAddress(targetAddress, 4)}
                </>
            }
            description={
                <>
                    This will allow <span className="font-medium text-primary">{appURL}</span> to create a
                    limited-access key for faster transactions with contract{" "}
                    <a
                        href={`${blockExplorerUrl}/address/${targetAddress}?tab=contract`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary border-b border-dashed hover:bg-primary/40"
                    >
                        {shortenAddress(targetAddress)}
                    </a>
                    . You can revoke this access at any time from your wallet settings.
                    <SectionBlock>
                        <div className="grid bg-warning/40 border-warning text-warning-content/90 dark:bg-warning/5 dark:border-warning/20 dark:text-warning gap-2 text-sm border py-[1em] px-[1.25em] rounded-lg w-full">
                            <p>This could result in loss of funds if the contract can access your assets.</p>
                            <p className="font-bold">Only proceed if you trust {appURL}.</p>
                        </div>
                    </SectionBlock>
                </>
            }
            actions={{
                accept: {
                    children: "Approve",
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
                        <SectionTitle>Session key</SectionTitle>
                        <SubsectionBlock>
                            <SubsectionContent>
                                <SubsectionTitle>Authorized contract address</SubsectionTitle>
                                <FormattedDetailsLine>
                                    <LinkToAddress address={targetAddress}> {targetAddress}</LinkToAddress>
                                </FormattedDetailsLine>
                            </SubsectionContent>
                        </SubsectionBlock>
                    </SectionBlock>
                </TabContent>
                <TabContent className="break-words" value={RequestTabsValues.Raw}>
                    <SectionBlock>
                        <SubsectionBlock>
                            <FormattedDetailsLine>{queryBytecode.data}</FormattedDetailsLine>
                        </SubsectionBlock>
                    </SectionBlock>
                </TabContent>
            </Tabs>
        </Layout>
    )
}
