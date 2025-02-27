import { useState } from "react"
import { FormField, FormFieldLabel } from "../primitives/form-field/FormField"
import { Input } from "../primitives/input/Input"
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
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<"wallet_addEthereumChain">) => {
    const [chain, setChain] = useState(params[0])
    return (
        <Layout
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
                        <FormField>
                            <FormFieldLabel htmlFor="custom-chain-name">Name</FormFieldLabel>
                            <Input
                                required
                                onChange={(e) => {
                                    setChain((old) => ({ ...old, chainName: e.target.value }))
                                }}
                                type="text"
                                id="custom-chain-name"
                                name="custom-chain-name"
                                value={chain.chainName}
                            />
                        </FormField>
                        <FormField>
                            <FormFieldLabel htmlFor="custom-chain-rpc-url">RPC URL</FormFieldLabel>
                            <Input
                                onChange={(e) => {
                                    setChain((old) => ({ ...old, rpcUrls: [e.target.value] }))
                                }}
                                required
                                type="url"
                                value={chain.rpcUrls[0] ?? ""}
                                id="custom-chain-rpc-url"
                                name="custom-chain-rpc-url"
                            />
                        </FormField>
                        <FormField>
                            <FormFieldLabel htmlFor="custom-chain-currency">Currency symbol</FormFieldLabel>
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
                                id="custom-chain-currency"
                                name="custom-chain-currency"
                            />
                        </FormField>

                        <FormField>
                            <FormFieldLabel isOptional htmlFor="custom-chain-block-explorer">
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
                                id="custom-chain-block-explorer"
                                name="custom-chain-block-explorer"
                            />
                        </FormField>
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
