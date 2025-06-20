import type { HappyMethodNames } from "@happy.tech/wallet-common"
import type { Address } from "viem"
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

export const HappyRequestSessionKey = ({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<typeof HappyMethodNames.REQUEST_SESSION_KEY>) => {
    const targetAddress: Address = params[0]
    const appURL = getAppURL()

    return (
        <Layout
            headline={<>Enable automatic approvals</>}
            description={
                <div className="mb-4">
                    <p className="mb-2">
                        The app will be able to send transactions to <LinkToAddress address={targetAddress} short />{" "}
                        without approval.
                    </p>
                    <p>You can revoke automatic approvals from the wallet.</p>
                </div>
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
                <SubsectionBlock variant="warning">
                    <SubsectionContent>
                        <p>You could lose tokens the contract can access.</p>
                        <p className="font-bold">
                            Only proceed if you trust <br /> {appURL}.
                        </p>
                    </SubsectionContent>
                </SubsectionBlock>
            </SectionBlock>
            <SectionBlock>
                <SubsectionBlock>
                    <SubsectionContent>
                        <SubsectionTitle>Authorized contract address</SubsectionTitle>
                        <FormattedDetailsLine>
                            <LinkToAddress address={targetAddress}>{targetAddress}</LinkToAddress>
                        </FormattedDetailsLine>
                    </SubsectionContent>
                </SubsectionBlock>
            </SectionBlock>
        </Layout>
    )
}
