import { useState } from "react"
import { getAppURL } from "#src/utils/appURL"
import { FormField, FormFieldLabel } from "../primitives/form-field/FormField"
import { Input } from "../primitives/input/Input"
import {
    FormattedDetailsLine,
    Layout,
    RequestTabsValues,
    SectionBlock,
    SubsectionBlock,
    TabContent,
    Tabs,
} from "./common/Layout"
import type { RequestConfirmationProps } from "./props"

export const WalletAddEthereumChain = ({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<"wallet_addEthereumChain">) => {
    const [chain, setChain] = useState(params[0])
    const appURL = getAppURL()
    return (
        <Layout
            labelHeader="Add custom network"
            headline={
                <>
                    <span className="text-primary">{appURL}</span> would like to use {params[0].chainName}
                </>
            }
            description={
                <>
                    <span className="font-medium text-primary">{appURL}</span> suggests adding{" "}
                    <span className="font-bold">{params[0].chainName}</span> to your wallet. Default settings can be
                    modified at your convenience. Make sure to{" "}
                    <a href={`https://chainlist.org/chain/${Number(chain.chainId)}`} target="_blank" rel="noreferrer">
                        verify network information
                    </a>{" "}
                    before adding it.
                </>
            }
            actions={{
                accept: {
                    children: "Add network",
                    onClick: () => accept({ method, params: [chain] }),
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
                        <form>
                            <fieldset className="grid gap-4">
                                <legend className="pb-2 text-xs font-semibold">Customize network information</legend>
                                <FormField>
                                    <FormFieldLabel htmlFor="custom-network-name">Name</FormFieldLabel>
                                    <Input
                                        required
                                        onChange={(e) => {
                                            setChain((old) => ({ ...old, chainName: e.target.value }))
                                        }}
                                        type="text"
                                        id="custom-network-name"
                                        name="custom-network-name"
                                        value={chain.chainName}
                                    />
                                </FormField>
                                <FormField>
                                    <FormFieldLabel htmlFor="custom-network-rpc-url">RPC URL</FormFieldLabel>
                                    <Input
                                        onChange={(e) => {
                                            setChain((old) => ({ ...old, rpcUrls: [e.target.value] }))
                                        }}
                                        required
                                        type="url"
                                        value={chain.rpcUrls[0] ?? ""}
                                        id="custom-network-rpc-url"
                                        name="custom-network-rpc-url"
                                    />
                                </FormField>
                                <FormField>
                                    <FormFieldLabel htmlFor="custom-network-currency">Currency symbol</FormFieldLabel>
                                    <Input
                                        type="text"
                                        onChange={(e) => {
                                            setChain((old) => ({
                                                ...old,
                                                nativeCurrency: {
                                                    name: e.target.value ?? "",
                                                    symbol: e.target.value,
                                                    decimals: 18,
                                                },
                                            }))
                                        }}
                                        required
                                        value={chain.nativeCurrency?.symbol ?? ""}
                                        id="custom-network-currency"
                                        name="custom-network-currency"
                                    />
                                </FormField>

                                <FormField>
                                    <FormFieldLabel isOptional htmlFor="custom-network-block-explorer">
                                        Block explorer
                                    </FormFieldLabel>
                                    <Input
                                        type="url"
                                        onChange={(e) => {
                                            setChain((old) => ({
                                                ...old,
                                                blockExplorerUrls: e.target.value ? [e.target.value] : undefined,
                                            }))
                                        }}
                                        value={chain.blockExplorerUrls?.[0] ?? ""}
                                        id="custom-network-block-explorer"
                                        name="custom-network-block-explorer"
                                    />
                                </FormField>
                            </fieldset>
                        </form>
                    </SectionBlock>
                </TabContent>
                <TabContent value={RequestTabsValues.Raw}>
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
