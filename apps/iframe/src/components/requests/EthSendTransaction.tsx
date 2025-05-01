import { TransactionType, parseBigInt } from "@happy.tech/common"
import { useAtomValue } from "jotai"
import { useEffect, useMemo, useState } from "react"
import {
    type AbiFunction,
    type Address,
    type RpcTransactionRequest,
    decodeFunctionData,
    formatEther,
    formatGwei,
    isAddress,
} from "viem"
import { useBalance, useEstimateFeesPerGas, useEstimateGas } from "wagmi"
import { abiContractMappingAtom } from "#src/state/loadedAbis"
import { userAtom } from "#src/state/user"
import { queryClient } from "#src/tanstack-query/config"
import { BlobTxWarning } from "./BlobTxWarning"
import ArgsList from "./common/ArgsList"
import DisclosureSection from "./common/DisclosureSection"
import { GasFieldName } from "./common/GasFieldDisplay"
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

/**
 * This is used since specifying a type in a `useSendTransaction` call
 * doesn't propagate to the `request` function of the EIP1193Provider -
 * hence, we determine the type from the gas fields present in the tx object.
 */
function classifyTxType(tx: RpcTransactionRequest) {
    switch (tx.type) {
        case TransactionType.Legacy:
            return "EIP-1559 (converted from legacy)"
        case TransactionType.EIP1559OptionalAccessList:
            return "EIP-1559 (optional access lists)"
        case TransactionType.EIP1559:
            return "EIP-1559"
        case TransactionType.EIP4844:
            return "EIP-4844 (unsupported)"
        case TransactionType.EIP7702:
            return "EIP-7702 (unsupported)"
        default:
            // these fields will be set by the wagmi hook if not
            // already present in the tx object
            if (tx.maxFeePerGas || tx.maxPriorityFeePerGas) {
                return "EIP-1559"
            }

            if (tx.gasPrice) {
                return "EIP-1559 (converted from legacy)"
            }
    }
}

export const EthSendTransaction = ({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<"eth_sendTransaction">) => {
    // useState + useEffect paradigm works here (over useMemo) since we will have
    // user interactions for sliders / options for setting gas manually
    const [tx, setTx] = useState<RpcTransactionRequest>(params[0])

    const user = useAtomValue(userAtom)
    const recordedAbisForUser = useAtomValue(abiContractMappingAtom)
    const targetContractAddress = tx.to && isAddress(tx.to) ? tx.to : undefined
    const txValue = parseBigInt(tx.value) ?? 0n
    const hasValue = !!txValue
    const isSelfPaying = false // currently we always sponsor

    const {
        data: balanceData,
        isPending: isBalanceDataPending,
        queryKey: userBalanceQueryKey,
    } = useBalance({
        address: user?.address,
        query: {
            enabled: user?.address && hasValue,
        },
    })

    const {
        data: { maxFeePerGas, maxPriorityFeePerGas } = {},
        isError: isFeeError,
        isPending: isEstimateDataPending,
        queryKey: gasFeesQueryKey,
    } = useEstimateFeesPerGas({ type: "eip1559" })

    const {
        data: estimatedGas,
        isPending: isEstimateGasDataPending,
        queryKey: gasEstimateQueryKey,
    } = useEstimateGas({
        account: user?.address,
        data: tx.data,
        value: txValue,
        to: tx.to,
    })

    const isConfirmActionDisabled =
        ((hasValue || isSelfPaying) && isBalanceDataPending) ||
        (isSelfPaying && isEstimateGasDataPending) ||
        isEstimateDataPending ||
        balanceData?.value === undefined ||
        balanceData.value < txValue + (estimatedGas ?? 0n)

    /**
     * If the maxFee/Gas and / or maxPriorityFee/Gas is not
     * defined in the wagmi hook / call, we get the estimates from the namesake
     * wagmi hook and roll them into the tx object.
     *
     * cf: https://viem.sh/docs/actions/public/estimateFeesPerGas
     */
    useEffect(() => {
        setTx((prevTx) => {
            // Handle partial errors by falling back to existing values or defaults
            const safeMaxFeePerGas = isFeeError ? (prevTx.maxFeePerGas ?? "0") : maxFeePerGas
            const safeMaxPriorityFeePerGas = isFeeError ? (prevTx.maxPriorityFeePerGas ?? "0") : maxPriorityFeePerGas

            // If gasPrice is defined (~ legacy tx),
            // set it as maxFeePerGas and reset gasLimit to null
            const updatedMaxFeePerGas = prevTx.gasPrice ? prevTx.gasPrice : safeMaxFeePerGas
            const updatedGasLimit = prevTx.gasPrice ? null : prevTx.gasPrice

            return {
                ...prevTx,
                maxFeePerGas: updatedMaxFeePerGas,
                maxPriorityFeePerGas: safeMaxPriorityFeePerGas,
                gasPrice: updatedGasLimit,
            } as RpcTransactionRequest
        })
    }, [maxFeePerGas, maxPriorityFeePerGas, isFeeError])

    const abiForContract =
        user?.address && targetContractAddress && recordedAbisForUser[user.address]?.[targetContractAddress]

    // Decodes the function call data for the given contract ABI and transaction data.
    const decodedData = useMemo(() => {
        if (!abiForContract || !tx.data) return undefined

        const { functionName, args } = decodeFunctionData({
            abi: abiForContract,
            data: tx.data,
        })

        const abiFuncDef = abiForContract.find(
            (item) => item.type === "function" && item.name === functionName,
        ) as AbiFunction

        return { args, abiFuncDef }
    }, [abiForContract, tx.data])

    // memo-ed values formatted for display
    const formatted = useMemo(() => {
        return {
            value: formatEther(txValue),
            maxFeePerGas: formatGwei(parseBigInt(tx.maxFeePerGas ?? "0") ?? 0n),
            maxPriorityFeePerGas: formatGwei(parseBigInt(tx.maxPriorityFeePerGas ?? "0") ?? 0n),
            type: classifyTxType(tx),
        }
    }, [tx, txValue])

    return (
        <>
            <Layout
                headline={<>Confirm transaction</>}
                hideActions={tx.type === TransactionType.EIP4844}
                actions={{
                    accept: {
                        children: balanceData?.value && estimatedGas ? "Confirm" : "Not enough funds!",
                        "aria-disabled": isConfirmActionDisabled,
                        onClick: () => {
                            if (isConfirmActionDisabled) return
                            accept({ method, params })
                            void queryClient.invalidateQueries({
                                queryKey: [gasFeesQueryKey, gasEstimateQueryKey, userBalanceQueryKey],
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
                        {tx?.to && (
                            <SubsectionContent>
                                <SubsectionTitle>Receiver address</SubsectionTitle>
                                <FormattedDetailsLine>
                                    <LinkToAddress address={tx.to as Address}>{tx.to}</LinkToAddress>
                                </FormattedDetailsLine>
                            </SubsectionContent>
                        )}

                        {txValue > 0n && (
                            <SubsectionContent>
                                <SubsectionTitle>Amount</SubsectionTitle>
                                <FormattedDetailsLine>{formatted.value} HAPPY</FormattedDetailsLine>
                            </SubsectionContent>
                        )}
                    </SubsectionBlock>
                </SectionBlock>
                <SectionBlock>
                    <SubsectionBlock>
                        <SubsectionContent>
                            <SubsectionTitle>Transaction type</SubsectionTitle>
                            <FormattedDetailsLine>{formatted.type}</FormattedDetailsLine>
                        </SubsectionContent>
                        <SubsectionContent>
                            <SubsectionTitle>{GasFieldName.MaxFeePerGas}</SubsectionTitle>
                            <FormattedDetailsLine>{formatted.maxFeePerGas}</FormattedDetailsLine>
                        </SubsectionContent>
                        <SubsectionContent>
                            <SubsectionTitle>{GasFieldName.MaxPriorityFeePerGas}</SubsectionTitle>
                            <FormattedDetailsLine>{formatted.maxPriorityFeePerGas}</FormattedDetailsLine>
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

                {tx.type === TransactionType.EIP4844 && (
                    <SectionBlock>
                        <BlobTxWarning onReject={reject} />
                    </SectionBlock>
                )}
            </Layout>
        </>
    )
}
