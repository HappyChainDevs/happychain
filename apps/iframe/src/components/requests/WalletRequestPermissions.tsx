import { EthRequestAccounts } from "#src/components/requests/EthRequestAccounts"
import { type PermissionDescriptionIndex, permissionDescriptions } from "#src/constants/requestLabels"
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
    requestCount,
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<"wallet_requestPermissions">) => {
    const appURL = getAppURL()
    const requestingMultiplePermissions = params.length > 1

    if (!requestingMultiplePermissions && "eth_accounts" in params[0])
        return (
            <EthRequestAccounts
                requestCount={requestCount}
                method={method}
                params={params}
                reject={reject}
                accept={accept}
            />
        )

    return (
        <Layout
            requestCount={requestCount}
            headline={<>Grant new permission{requestingMultiplePermissions ? "s" : ""}</>}
            description={
                <div className="mb-4">
                    <p className="mb-2">
                        Requested by <span className="font-medium text-primary">{appURL}</span>
                    </p>
                    <p>You can revoke permissions from the wallet settings.</p>
                </div>
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
        </Layout>
    )
}
