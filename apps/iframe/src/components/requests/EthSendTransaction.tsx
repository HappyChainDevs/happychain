import { Onchain } from "@happy.tech/boop-sdk"
import { TransactionType, ifDef, parseBigInt } from "@happy.tech/common"
import { useAtomValue } from "jotai"
import { useMemo } from "react"
import { type RpcTransactionRequest, formatEther, formatGwei, isAddress, toHex } from "viem"
import { useBalance } from "wagmi"
import { classifyTxType, isSupported } from "#src/components/requests/utils/transactionTypes"
import { useTxDecodedData } from "#src/components/requests/utils/useTxDecodedData"
import { useTxGasLimit } from "#src/components/requests/utils/useTxGasLimit"
import { useSimulateBoop } from "#src/hooks/useSimulateBoop.ts"
import { type ValidRpcTransactionRequest, checkedTx } from "#src/requests/utils/checks.ts"
import { userAtom } from "#src/state/user"
import { queryClient } from "#src/tanstack-query/config"
import FieldLoader from "../loaders/FieldLoader"
import { BlobTxWarning } from "./BlobTxWarning"
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
    const tx: ValidRpcTransactionRequest = checkedTx(params[0]) // TODO not ideal to use this since it throws errors not meant for the popup
    const user = useAtomValue(userAtom)
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

    const updatedTx = useMemo(
        () =>
            ({
                ...tx,
                maxFeePerGas: ifDef(txMaxFeePerGas, toHex),
                maxPriorityFeePerGas: ifDef(txMaxPriorityFeePerGas, toHex),
                gasPrice: ifDef(txGasPrice, toHex),
                gas: ifDef(txGasLimit, toHex),
                type: txType,
            }) as RpcTransactionRequest,
        [tx, txMaxFeePerGas, txMaxPriorityFeePerGas, txGasPrice, txGasLimit, txType],
    )

    // ====================================== Boop Gas details ======================================

    const {
        data: simulatedBoopData,
        isPending: boopSimulationPending,
        isError: boopSimulationError,
    } = useSimulateBoop({
        userAddress: user?.address,
        tx,
    })

    const formatted = useMemo(() => {
        if (!simulatedBoopData) return undefined

        if (simulatedBoopData.status === Onchain.Success) {
            const { maxFeePerGas: boopMaxFeePerGas, submitterFee = 0n, gas: boopGas } = simulatedBoopData

            const maxFeePerGas2 = txMaxFeePerGas ?? txGasPrice ?? boopMaxFeePerGas
            const gasLimit2 = txGasLimit ?? BigInt(boopGas)
            return {
                value: formatEther(txValue),
                totalGas: ifDef(maxFeePerGas2 * gasLimit2 + submitterFee, formatGwei),
                submitterFee: submitterFee,
            }
        }
    }, [simulatedBoopData, txGasLimit, txGasPrice, txValue, txMaxFeePerGas])

    const notEnoughFunds = !!userBalance?.value && userBalance.value < txValue + (txGasLimit ?? 0n)

    const isConfirmActionDisabled =
        !isValidTransaction ||
        (shouldQueryBalance && isBalancePending) ||
        areFeesPending ||
        isGasLimitPending ||
        notEnoughFunds ||
        boopSimulationError

    if (!isValidTransaction) {
        // biome-ignore format: compact
        const description =
                !user?.address ? "Disconnected from wallet" :
                !isSupportedTxType ? `Invalid transaction type: ${txType}` :
                !tx.to ? "Invalid transaction: missing receiver address" :
                `Invalid receiver address: ${tx.to}`
        return <RequestDisabled headline="Confirm transaction" description={description} reject={reject} />
    }

    return (
        <>
            <Layout
                headline="Confirm transaction"
                actions={{
                    accept: {
                        children: notEnoughFunds ? "Not enough funds!" : "Confirm",
                        "aria-disabled": isConfirmActionDisabled,
                        onClick: () => {
                            if (isConfirmActionDisabled) return
                            accept({ method, params: [updatedTx], extraData: simulatedBoopData })
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
                <SectionBlock>
                    <SubsectionBlock>
                        {txTo && (
                            <SubsectionContent>
                                <SubsectionTitle>Receiver address</SubsectionTitle>
                                <FormattedDetailsLine>
                                    <LinkToAddress address={txTo}>{txTo}</LinkToAddress>
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
                            <FormattedDetailsLine>
                                {boopSimulationPending ? (
                                    <FieldLoader />
                                ) : (
                                    `Cost: ${formatted?.totalGas} HAPPY (Submitter Fee: ${formatted?.submitterFee})`
                                )}
                            </FormattedDetailsLine>
                        </SubsectionContent>
                    </SubsectionBlock>
                </SectionBlock>

                {!isSelfPaying && (
                    <SectionBlock>
                        <SubsectionBlock>
                            <SubsectionTitle>
                                Sponsored by <span className="text-accent">HappyChain</span>
                            </SubsectionTitle>
                        </SubsectionBlock>
                    </SectionBlock>
                )}

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
                {tx.type === TransactionType.EIP4844 && (
                    <SectionBlock>
                        <BlobTxWarning onReject={reject} />
                    </SectionBlock>
                )}
            </Layout>
        </>
    )
}
