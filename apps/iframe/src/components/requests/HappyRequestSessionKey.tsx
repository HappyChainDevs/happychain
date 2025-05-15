import type { HappyMethodNames } from "@happy.tech/common"
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
                <>
                    <div className="mb-4">
                        <p className="mb-2">
                            The app will be able to send transactions to <LinkToAddress addressLabel={targetAddress} short />{" "}
                            without approval.
                        </p>
                        <p>You can revoke automatic approvals from the wallet.</p>
                    </div>
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
                            <LinkToAddress addressLabel={targetAddress}>{targetAddress}</LinkToAddress>
                        </FormattedDetailsLine>
                    </SubsectionContent>
                </SubsectionBlock>
            </SectionBlock>
        </Layout>
    )
}
