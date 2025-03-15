import { EthRequestAccounts } from "#src/components/requests/EthRequestAccounts"
import { type PermissionDescriptionIndex, permissionDescriptions } from "#src/constants/requestLabels.ts"
import { getAppURL } from "#src/utils/appURL"
import {
    FormattedDetailsLine,
    Layout,
    SectionBlock,
    SectionTitle,
    SubsectionBlock,
    SubsectionContent,
    SubsectionTitle,
} from "./common/Layout"
import type { RequestConfirmationProps } from "./props"

export const WalletRequestPermissions = ({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<"wallet_requestPermissions">) => {
    const appURL = getAppURL()
    const requestingMultiplePermissions = params.length > 1

    if (!requestingMultiplePermissions && "eth_accounts" in params[0])
        return <EthRequestAccounts method={method} params={params} reject={reject} accept={accept} />

    return (
        <Layout
            labelHeader={`Grant permission${requestingMultiplePermissions ? "s" : ""}`}
            headline={
                <>
                    <span className="text-primary">{appURL}</span> is requesting new permission
                    {requestingMultiplePermissions ? "s" : ""}
                </>
            }
            description={
                <>
                    <span className="font-medium text-primary">{appURL}</span> would like to :
                </>
            }
            actions={{
                accept: {
                    children: `Grant permission${requestingMultiplePermissions ? "s" : ""}`,
                    onClick: () => accept({ method, params }),
                },
                reject: {
                    children: "Go back",
                    onClick: reject,
                },
            }}
        >
            <SectionBlock>
                <SectionTitle>Permissions</SectionTitle>
                <SubsectionBlock>
                    <SubsectionContent>
                        {params.map((param) => {
                            const [[name]] = Object.entries(param)
                            return (
                                <>
                                    <SubsectionTitle key={`scope-${name}-title`}>{name}</SubsectionTitle>
                                    <FormattedDetailsLine key={`scope-${name}-description`}>
                                        {permissionDescriptions[name as PermissionDescriptionIndex]}
                                    </FormattedDetailsLine>
                                </>
                            )
                        })}
                    </SubsectionContent>
                </SubsectionBlock>
            </SectionBlock>
            <SectionBlock>
                <SubsectionBlock>
                    <SubsectionContent>
                        <SubsectionTitle>Data</SubsectionTitle>

                        <FormattedDetailsLine isCode>{JSON.stringify(params, null, 2)}</FormattedDetailsLine>
                    </SubsectionContent>
                </SubsectionBlock>
            </SectionBlock>
            <SectionBlock>
                <p className="font-bold pb-8 text-center text-sm">
                    You can revoke granted permissions from the wallet.
                </p>
            </SectionBlock>
        </Layout>
    )
}
