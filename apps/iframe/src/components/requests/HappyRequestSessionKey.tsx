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
    SectionBlock,
    SubsectionBlock,
    SubsectionContent,
    SubsectionTitle,
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
            headline={<>Enable automatic approvals</>}
            description={
                <>
                    <p className="mb-2">
                        The app will be able to send transactions to{" "}
                        <a
                            href={`${blockExplorerUrl}/address/${targetAddress}?tab=contract`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary border-b border-dashed hover:bg-primary/40"
                        >
                            {shortenAddress(targetAddress)}
                        </a>{" "}
                        without approval.
                    </p>
                    <p>You can revoke automatic approvals from the wallet.</p>
                    <SectionBlock>
                        <div className="grid bg-warning/40 border-warning text-warning-content/90 dark:bg-warning/5 dark:border-warning/20 dark:text-warning gap-2 text-sm border py-[1em] px-[1.25em] rounded-lg w-full">
                            <p>You could lose tokens the contract can access.</p>
                            <p className="font-bold">
                                Only proceed if you trust <br /> {appURL}.
                            </p>
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
            <SectionBlock>
                <SubsectionBlock>
                    <SubsectionContent>
                        <SubsectionTitle>Authorized contract address</SubsectionTitle>
                        <FormattedDetailsLine>
                            <LinkToAddress address={targetAddress}> {targetAddress}</LinkToAddress>
                        </FormattedDetailsLine>
                    </SubsectionContent>
                </SubsectionBlock>
            </SectionBlock>
        </Layout>
    )
}
