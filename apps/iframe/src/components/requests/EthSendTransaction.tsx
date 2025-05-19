import { parseBigInt } from "@happy.tech/common"
import { useAtomValue } from "jotai"
import { useMemo } from "react"
import { formatEther, isAddress } from "viem"
import { useBalance } from "wagmi"
import { classifyTxType, isSupported } from "#src/components/requests/utils/transactionTypes"
import { useTxDecodedData } from "#src/components/requests/utils/useTxDecodedData"
import { getPaymaster, getPaymasterName } from "#src/constants/contracts"
import { useSimulateBoop } from "#src/hooks/useSimulateBoop"
import { userAtom } from "#src/state/user"

import FieldLoader from "../loaders/FieldLoader"
import ArgsList from "./common/ArgsList"
import DisclosureSection from "./common/DisclosureSection"
import {
    FormattedDetailsLine,
    Layout,
    LinkToAddress,
    SectionBlock,
    SubsectionBlock,
    SubsectionContent,
    SubsectionTitle,
} from "./common/Layout"
import { RequestDisabled } from "./common/RequestDisabled"
import type { RequestConfirmationProps } from "./props"

const MIN_DISPLAY_WEI = 100_000_000_000_000n // 0.0001 HAPPY
const MIN_DISPLAY_STR = "0.0001"

export const EthSendTransaction = ({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<"eth_sendTransaction">) => {
    const tx = params[0]
    const user = useAtomValue(userAtom)
    const paymasterInUse = getPaymaster()
    const txTo = tx.to && isAddress(tx.to) ? tx.to : undefined
    const txValue = parseBigInt(tx.value) ?? 0n
    const txType = classifyTxType(tx)
    const isSupportedTxType = isSupported(txType)
    const isValidTransaction = !!user?.address && isSupportedTxType && !!txTo
    const isSelfPaying = false // currently we always sponsor
    const shouldQueryBalance = (!!txValue || isSelfPaying) && isValidTransaction

    const decodedData = useTxDecodedData({ tx, txTo, account: user?.address })

    const { data: userBalance, isPending: isBalancePending } = useBalance({
        address: user?.address,
        query: { enabled: shouldQueryBalance },
    })

    const { simulateOutput, simulateError, isSimulatePending } = useSimulateBoop({
        userAddress: user?.address,
        tx,
        enabled: isValidTransaction,
    })

    /**
     * Computes and formats gas-related costs from the simulation output.
     *
     * - Calculates the total estimated cost: `(gas * maxFeePerGas) + submitterFee`
     * - Rounds the total cost to a minimum display precision
     * - Formats both total cost and submitter fee as strings in ETH units
     *
     * Returns:
     * {
     *   cost: `bigint` — raw total cost in wei,
     *   submitterFee: `bigint` — raw submitter fee in wei,
     *   f: {
     *     cost: `string` — formatted total cost in ETH (or a fallback like "0.0001"),
     *     submitterFee: `string` — formatted submitter fee in ETH
     *   }
     * }
     */

    const values = useMemo(() => {
        if (!simulateOutput) return
        const { maxFeePerGas, submitterFee, gas } = simulateOutput
        const cost = BigInt(gas) * maxFeePerGas + submitterFee
        let roundedCost = (cost / MIN_DISPLAY_WEI) * MIN_DISPLAY_WEI
        roundedCost += cost % MIN_DISPLAY_WEI > MIN_DISPLAY_WEI / 2n ? MIN_DISPLAY_WEI : 0n
        return {
            cost,
            submitterFee: simulateOutput.submitterFee,
            f: {
                cost: cost < MIN_DISPLAY_WEI ? MIN_DISPLAY_STR : formatEther(roundedCost),
                submitterFee: formatEther(submitterFee),
            },
        }
    }, [simulateOutput])

    const notEnoughFunds = !!userBalance?.value && !!values?.cost && userBalance.value < txValue + values.cost

    const isConfirmActionDisabled =
        !isValidTransaction || (shouldQueryBalance && isBalancePending) || notEnoughFunds || !simulateOutput

    const isRequestDisabled = !isValidTransaction || simulateError || simulateOutput?.feeTooLowDuringSimulation

    if (isRequestDisabled) {
        // biome-ignore format: compact
        const description =
                // request payload is invalid
                !user?.address ? "Disconnected from wallet" :
                !isSupportedTxType ? `Invalid transaction type: ${txType}` :
                !tx.to ? `Invalid receiver address: ${tx.to}` :
                // issues with boop simulation
                simulateError ? `Failed to simulate transaction: ${simulateError.message}` :
                simulateOutput?.feeTooLowDuringSimulation ? "Provided maxFeePerGas is lower than the current gas price." :
                "Unknown error"

        return <RequestDisabled headline="Confirm transaction" description={description} reject={reject} />
    }

    return (
        <>
            <Layout
                headline="Confirm transaction"
                actions={{
                    accept: {
                        children: notEnoughFunds
                            ? "Not enough funds!"
                            : isConfirmActionDisabled
                              ? "Preparing..."
                              : "Confirm",
                        "aria-disabled": isConfirmActionDisabled,
                        onClick: () => {
                            if (isConfirmActionDisabled) return
                            accept({ method, params: [tx], extraData: simulateOutput })
                        },
                    },
                    reject: {
                        children: "Go back",
                        onClick: reject,
                    },
                }}
            >
                <SectionBlock>
                    <SubsectionBlock>
                        {txTo && (
                            <SubsectionContent>
                                <SubsectionTitle>Receiver address</SubsectionTitle>
                                <FormattedDetailsLine>
                                    <LinkToAddress address={txTo} />
                                </FormattedDetailsLine>
                            </SubsectionContent>
                        )}

                        {txValue > 0n && (
                            <SubsectionContent>
                                <SubsectionTitle>Sending amount</SubsectionTitle>
                                <FormattedDetailsLine>{formatEther(txValue)} HAPPY</FormattedDetailsLine>
                            </SubsectionContent>
                        )}
                    </SubsectionBlock>
                </SectionBlock>
                <SectionBlock>
                    <SubsectionBlock>
                        <SubsectionContent>
                            <SubsectionTitle>Cost</SubsectionTitle>
                            <FormattedDetailsLine>
                                {isSimulatePending ? (
                                    <FieldLoader />
                                ) : (
                                    `${values?.f.cost} $HAPPY ${(values?.submitterFee ?? 0n) > 0n ? `(Submitter Fee: ${values?.f.submitterFee})` : ""}`
                                )}{" "}
                            </FormattedDetailsLine>
                            {!isSelfPaying && (
                                <span className="text-accent text-xs">
                                    Sponsored by{" "}
                                    <LinkToAddress address={paymasterInUse}>
                                        {getPaymasterName(paymasterInUse)}
                                    </LinkToAddress>
                                </span>
                            )}
                        </SubsectionContent>
                    </SubsectionBlock>
                </SectionBlock>
                {decodedData && (
                    <DisclosureSection
                        title="Decoded Function Data"
                        showWarning
                        warningText={"This ABI is not verified."}
                        isOpen={true}
                    >
                        <div className="flex flex-wrap justify-between items-baseline gap-2 p-2 border-b border-neutral/10">
                            <span className="opacity-75 text-xs">Function Name:</span>
                            <span className="font-mono text-xs truncate px-2 py-1 bg-primary text-primary-content rounded-md max-w-[50%] hover:break-words">
                                {decodedData.abiFuncDef.name}
                            </span>
                        </div>

                        {decodedData.args?.length && (
                            <div className="w-full">
                                <ArgsList args={decodedData.args} fnInputs={decodedData.abiFuncDef.inputs} />
                            </div>
                        )}
                    </DisclosureSection>
                )}

                <DisclosureSection title="Raw Request">
                    <div className="grid gap-4 p-2">
                        <FormattedDetailsLine isCode>{JSON.stringify(params, null, 2)}</FormattedDetailsLine>
                    </div>
                </DisclosureSection>
            </Layout>
        </>
    )
}
