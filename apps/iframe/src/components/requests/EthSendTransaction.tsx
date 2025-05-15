import { Onchain } from "@happy.tech/boop-sdk"
import { ifDef, parseBigInt } from "@happy.tech/common"
import { useAtomValue } from "jotai"
import { useMemo } from "react"
import { type Address, formatEther, formatGwei, isAddress, toHex } from "viem"
import { useBalance } from "wagmi"
import { classifyTxType, isSupported } from "#src/components/requests/utils/transactionTypes"
import { useTxDecodedData } from "#src/components/requests/utils/useTxDecodedData"
import { useTxGasLimit } from "#src/components/requests/utils/useTxGasLimit"
import { getPaymaster, getPaymasterName } from "#src/constants/contracts.ts"
import { useSimulateBoop } from "#src/hooks/useSimulateBoop.ts"
import type { ValidRpcTransactionRequest } from "#src/requests/utils/checks.ts"
import { userAtom } from "#src/state/user"
import { queryClient } from "#src/tanstack-query/config"
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
import { useTxFees } from "./utils/useTxFees"

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
    const isValidTransaction = (!!user?.address && !isSupportedTxType) || !!txTo
    const isSelfPaying = false // currently we always sponsor
    const shouldQueryBalance = (!!txValue || isSelfPaying) && isValidTransaction

    // ====================================== Contract ABI details ======================================

    const decodedData = useTxDecodedData({ tx, txTo, account: user?.address })

    // ====================================== Tx details ======================================

    const {
        data: userBalance,
        isPending: isBalancePending,
        queryKey: balanceQueryKey,
    } = useBalance({
        address: user?.address,
        query: { enabled: shouldQueryBalance },
    })

    const { txMaxFeePerGas, txMaxPriorityFeePerGas, txGasPrice, areFeesPending, feesQueryKey } = useTxFees({
        tx,
        txType,
        enabled: isValidTransaction,
    })

    const { txGasLimit, isGasLimitPending, gasLimitQueryKey } = useTxGasLimit({
        tx,
        txValue,
        account: user?.address,
        enabled: isValidTransaction,
    })

    const validTx = useMemo(() => {
        if (!txTo) return undefined
        return {
            ...tx,
            from: (tx.from ?? user?.address) as Address,
            to: txTo,
            gas: ifDef(txGasLimit, toHex),
            gasPrice: ifDef(txGasPrice, toHex),
            maxFeePerGas: ifDef(txMaxFeePerGas ?? txGasPrice, toHex),
            maxPriorityFeePerGas: ifDef(txMaxPriorityFeePerGas, toHex),
            type: txType,
        } as ValidRpcTransactionRequest
    }, [tx, txTo, txGasLimit, txGasPrice, txMaxFeePerGas, txMaxPriorityFeePerGas, txType, user?.address])

    // ====================================== Boop Gas details ======================================

    const {
        simulatedBoopData,
        isSimulationPending: boopSimulationPending,
        simulatedBoopError,
    } = useSimulateBoop({
        userAddress: user?.address,
        tx: validTx as ValidRpcTransactionRequest,
        enabled: !!validTx && isValidTransaction,
    })

    const showSimulationResult = !boopSimulationPending && (simulatedBoopData || simulatedBoopError)

    const formatted = useMemo(() => {
        if (!simulatedBoopData || simulatedBoopData.status !== Onchain.Success || simulatedBoopError) return

        if (simulatedBoopData.status === Onchain.Success) {
            const { maxFeePerGas: boopMaxFeePerGas, submitterFee = 0n, gas: boopGas } = simulatedBoopData

            const maxFeePerGas = txMaxFeePerGas ?? txGasPrice ?? boopMaxFeePerGas
            const gasLimit = txGasLimit ?? BigInt(boopGas)
            return {
                value: formatEther(txValue),
                totalGas: ifDef(maxFeePerGas * gasLimit + submitterFee, formatGwei),
                submitterFee: submitterFee,
            }
        }
    }, [simulatedBoopError, simulatedBoopData, txGasLimit, txGasPrice, txValue, txMaxFeePerGas])

    const notEnoughFunds = !!userBalance?.value && userBalance.value < txValue + (txGasLimit ?? 0n)

    const isConfirmActionDisabled =
        !isValidTransaction ||
        (shouldQueryBalance && isBalancePending) ||
        areFeesPending ||
        isGasLimitPending ||
        notEnoughFunds ||
        !!simulatedBoopError

    if (boopSimulationPending) {
        return (
            <Layout
                headline="Confirm transaction"
                actions={{
                    reject: {
                        children: "Go back",
                        onClick: reject,
                    },
                }}
            >
                <SectionBlock>
                    <SubsectionBlock>
                        <FieldLoader />
                    </SubsectionBlock>
                </SectionBlock>
            </Layout>
        )
    }

    if (!isValidTransaction || simulatedBoopError) {
        const description = !user?.address
            ? "Disconnected from wallet"
            : !isSupportedTxType
              ? `Invalid transaction type: ${txType}`
              : !tx.to
                ? "Invalid transaction: missing receiver address"
                : simulatedBoopError
                  ? simulatedBoopError.description
                  : `Invalid receiver address: ${tx.to}`
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
                        "aria-hidden": simulatedBoopError,
                        onClick: () => {
                            if (!validTx || isConfirmActionDisabled) return
                            accept({ method, params: [validTx], extraData: simulatedBoopData })
                            void queryClient.invalidateQueries({
                                queryKey: [feesQueryKey, gasLimitQueryKey, balanceQueryKey],
                            })
                        },
                    },
                    reject: {
                        children: "Go back",
                        onClick: reject,
                    },
                }}
            >
                {!showSimulationResult ? (
                    <FieldLoader />
                ) : (
                    <>
                        <SectionBlock>
                            <SubsectionBlock>
                                {txTo && (
                                    <SubsectionContent>
                                        <SubsectionTitle>Receiver address</SubsectionTitle>
                                        <FormattedDetailsLine>
                                            <LinkToAddress addressLabel={txTo}>{txTo}</LinkToAddress>
                                        </FormattedDetailsLine>
                                    </SubsectionContent>
                                )}

                                {txValue > 0n && (
                                    <SubsectionContent>
                                        <SubsectionTitle>Sending amount</SubsectionTitle>
                                        <FormattedDetailsLine>{formatted?.value} HAPPY</FormattedDetailsLine>
                                    </SubsectionContent>
                                )}
                            </SubsectionBlock>
                        </SectionBlock>
                        <SectionBlock>
                            <SubsectionBlock>
                                <SubsectionContent>
                                    <SubsectionTitle>Cost</SubsectionTitle>
                                    <FormattedDetailsLine>
                                        {boopSimulationPending ? (
                                            <FieldLoader />
                                        ) : (
                                            `${formatted?.totalGas} $HAPPY ${formatted?.submitterFee && formatted.submitterFee > 0n ? `(Submitter Fee: ${formatted.submitterFee})` : ""}`
                                        )}
                                    </FormattedDetailsLine>
                                    {!isSelfPaying && (
                                        <SubsectionTitle>
                                            Sponsored by{" "}
                                            <LinkToAddress addressLabel={getPaymasterName(paymasterInUse)} short />
                                        </SubsectionTitle>
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
                    </>
                )}
            </Layout>
        </>
    )
}
