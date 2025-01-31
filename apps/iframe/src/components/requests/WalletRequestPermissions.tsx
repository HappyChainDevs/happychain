import { permissionDescriptions, type PermissionDescriptionIndex } from "#src/constants/requestLabels.ts"
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

    return (
        <Layout
            labelHeader="Grant permission"
            headline={
                <>
                    <span className="text-primary">{appURL}</span> is requesting new permissions
                </>
            }
            description={
                <>
                    <span className="font-medium text-primary">{appURL}</span> would like to :
                </>
            }
            actions={{
                accept: {
                    children: "Grant permission",
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
                        <SectionTitle>Scopes</SectionTitle>
                        <SubsectionBlock>
                            <SubsectionContent>
                                {params.map((param) => {
                                    const [[name]] = Object.entries(param)
                                    return (
                                        <>
                                            <SubsectionTitle key={`scope-${name}-title`}>{name}</SubsectionTitle>
                                            <FormattedDetailsLine key={`scope-${name}-description`}>
                                                {permissionDescriptions[(name as PermissionDescriptionIndex)]}
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
                            <FormattedDetailsLine>{JSON.stringify(params, null, 2)}</FormattedDetailsLine>
                        </SubsectionBlock>
                    </SectionBlock>
                </TabContent>
            </Tabs>
            <SectionBlock>
                <p className="font-bold pb-8 text-center text-sm">
                    You can revoke granted permissions from your wallet whenever you want.
                </p>
            </SectionBlock>
        </Layout>
    )
}
