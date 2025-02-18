import { type PermissionDescriptionIndex, permissionDescriptions } from "#src/constants/requestLabels.ts"
import { getAppURL } from "#src/utils/appURL"
import {
    FormattedDetailsLine,
    Layout,
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

export const WalletRequestPermissions = ({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<"wallet_requestPermissions">) => {
    const appURL = getAppURL()
    const requestingMultiplePermissions = params.length > 1
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
            <Tabs defaultValue={RequestTabsValues.Details}>
                <TabContent value={RequestTabsValues.Details}>
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
                </TabContent>
                <TabContent className="break-words" value={RequestTabsValues.Raw}>
                    <SectionBlock>
                        <SubsectionBlock>
                            <FormattedDetailsLine isCode>{JSON.stringify(params, null, 2)}</FormattedDetailsLine>
                        </SubsectionBlock>
                    </SectionBlock>
                </TabContent>
            </Tabs>
            <SectionBlock>
                <p className="font-bold pb-8 text-center text-sm">
                    You can revoke granted permissions from the wallet.
                </p>
            </SectionBlock>
        </Layout>
    )
}
