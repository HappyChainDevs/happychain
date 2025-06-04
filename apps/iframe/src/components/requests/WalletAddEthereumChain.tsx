import { useState } from "react"
import { FormField } from "../primitives/form-field/FormField"
import {
    FormattedDetailsLine,
    Layout,
    SectionBlock,
    SubsectionBlock,
    SubsectionContent,
    SubsectionTitle,
} from "./common/Layout"
import type { RequestConfirmationProps } from "./props"

export const WalletAddEthereumChain = ({
    requestCount,
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<"wallet_addEthereumChain">) => {
    const [chain, setChain] = useState(params[0])
    return (
        <Layout
            requestCount={requestCount}
            labelHeader="Add custom chain"
            headline="Add new chain"
            actions={{
                accept: {
                    children: "Add chain",
                    onClick: () => accept({ method, params: [chain] }),
                },
                reject: {
                    children: "Go back",
                    onClick: reject,
                },
            }}
        >
            <SectionBlock>
                <form>
                    <fieldset className="grid gap-4">
                        <legend className="pb-2 text-xs font-semibold">Customize chain information</legend>
                        <FormField.Root required>
                            <FormField.Label htmlFor="custom-chain-name">Name</FormField.Label>
                            <FormField.Input
                                required
                                onChange={(e) => {
                                    setChain((old) => ({ ...old, chainName: e.target.value }))
                                }}
                                type="text"
                                name="custom-chain-name"
                                value={chain.chainName}
                            />
                        </FormField.Root>
                        <FormField.Root required>
                            <FormField.Label>RPC URL</FormField.Label>
                            <FormField.Input
                                onChange={(e) => {
                                    setChain((old) => ({ ...old, rpcUrls: [e.target.value] }))
                                }}
                                type="url"
                                value={chain.rpcUrls[0] ?? ""}
                            />
                        </FormField.Root>
                        <FormField.Root required>
                            <FormField.Label>Currency symbol</FormField.Label>
                            <FormField.Input
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
                                value={chain.nativeCurrency?.symbol ?? ""}
                            />
                        </FormField.Root>

                        <FormField.Root>
                            <FormField.Label>Block explorer</FormField.Label>
                            <FormField.Input
                                type="url"
                                onChange={(e) => {
                                    setChain((old) => ({
                                        ...old,
                                        blockExplorerUrls: e.target.value ? [e.target.value] : undefined,
                                    }))
                                }}
                                value={chain.blockExplorerUrls?.[0] ?? ""}
                            />
                        </FormField.Root>
                    </fieldset>
                </form>
            </SectionBlock>
            <SectionBlock>
                <SubsectionBlock>
                    <SubsectionContent>
                        <SubsectionTitle>Data</SubsectionTitle>

                        <FormattedDetailsLine isCode>{JSON.stringify(params, null, 2)}</FormattedDetailsLine>
                    </SubsectionContent>
                </SubsectionBlock>
            </SectionBlock>
        </Layout>
    )
}
