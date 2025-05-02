import { TransactionType, ifdef, parseBigInt } from "@happy.tech/common"
import { useAtomValue } from "jotai"
import { useMemo } from "react"
import {
    type AbiFunction,
    type Address,
    type RpcTransactionRequest,
    decodeFunctionData,
    formatEther,
    formatGwei,
    isAddress,
    toHex,
} from "viem"
import { type UseEstimateFeesPerGasReturnType, useBalance, useEstimateFeesPerGas, useEstimateGas } from "wagmi"
import { classifyTxType, isSupported } from "#src/components/requests/utils/transactionTypes"
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

export const EthSendTransaction = ({
    method,
    params,
    reject,
    accept,
}: RequestConfirmationProps<"eth_sendTransaction">) => {
    const tx = params[0]
    const user = useAtomValue(userAtom)
    const recordedAbisForUser = useAtomValue(abiContractMappingAtom)
    const txTo = tx.to && isAddress(tx.to) ? tx.to : undefined
    const txValue = parseBigInt(tx.value) ?? 0n
    const txType = classifyTxType(tx)
    const isSupportedTxType = isSupported(txType)
    const isValidTransaction = (!!user?.address && !isSupportedTxType) || !!txTo
    const isSelfPaying = false // currently we always sponsor
    const shouldQueryBalance = (!!txValue || isSelfPaying) && isValidTransaction

    const {
        data: userBalance,
        isPending: isBalancePending,
        queryKey: balanceQueryKey,
    } = useBalance({
        address: user?.address,
        query: {
            enabled: shouldQueryBalance,
        },
    })

    const parsedTxMaxFeePerGas = parseBigInt(tx.maxFeePerGas)
    const parsedTxMaxPriorityFeePerGas = parseBigInt(tx.maxPriorityFeePerGas)
    const parsedTxGasPrice = parseBigInt(tx.gasPrice)
    const shouldQueryFees = !parsedTxMaxFeePerGas && !parsedTxGasPrice && isValidTransaction

    const {
        data: {
            maxFeePerGas: fetchedMaxFeePerGas,
            maxPriorityFeePerGas: fetchedMaxPriorityFeePerGas,
            gasPrice: fetchedGasPrice,
        } = {},
        isPending: areFeesPending,
        queryKey: feesQueryKey,
    } = useEstimateFeesPerGas({
        type: txType === TransactionType.EIP1559 ? "eip1559" : "legacy",
        query: {
            enabled: shouldQueryFees,
        },
    }) as UseEstimateFeesPerGasReturnType<"eip1559"> & {
        data: {
            maxFeePerGas?: bigint
            maxPriorityFeePerGas?: bigint
            gasPrice?: bigint
        }
    }

    const txMaxFeePerGas = parsedTxMaxPriorityFeePerGas ?? fetchedMaxFeePerGas
    const txMaxPriorityFeePerGas = parsedTxMaxPriorityFeePerGas ?? fetchedMaxPriorityFeePerGas
    const txGasPrice = parsedTxGasPrice ?? fetchedGasPrice

    const parsedGasLimit = parseBigInt(tx.gas)
    const shouldQueryGasLimit = !parsedGasLimit && isValidTransaction

    const {
        data: gasLimit,
        isPending: isGasLimitPending,
        queryKey: gasLimitQueryKey,
    } = useEstimateGas({
        account: user?.address,
        data: tx.data,
        value: txValue,
        to: tx.to,
        query: {
            enabled: shouldQueryGasLimit,
        },
    })

    const txGasLimit = parsedGasLimit ?? gasLimit

    const updatedTx = useMemo(
        () =>
            ({
                ...tx,
                maxFeePerGas: ifdef(txMaxFeePerGas, toHex),
                maxPriorityFeePerGas: ifdef(txMaxPriorityFeePerGas, toHex),
                gasPrice: ifdef(txGasPrice, toHex),
                gas: ifdef(txGasLimit, toHex),
                type: txType,
            }) as RpcTransactionRequest,
        [tx, txMaxFeePerGas, txMaxPriorityFeePerGas, txGasPrice, txGasLimit, txType],
    )

    const formatted = useMemo(() => {
        return {
            value: formatEther(txValue),
            maxFeePerGas: formatGwei(txMaxFeePerGas ?? 0n),
            maxPriorityFeePerGas: formatGwei(txMaxPriorityFeePerGas ?? 0n),
        }
    }, [txValue, txMaxFeePerGas, txMaxPriorityFeePerGas])

    const isConfirmActionDisabled =
        !isValidTransaction ||
        (shouldQueryBalance && isBalancePending) ||
        (shouldQueryFees && areFeesPending) ||
        (shouldQueryGasLimit && isGasLimitPending) ||
        userBalance?.value === undefined ||
        userBalance.value < txValue + (gasLimit ?? 0n)

    const abiForContract = user?.address && txTo && recordedAbisForUser[user.address]?.[txTo]

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

    if (!isValidTransaction) {
        const description = !isSupportedTxType
            ? `Invalid transaction type: ${txType}`
            : !tx.to
              ? "Invalid transaction: missing receiver address"
              : `Invalid receiver address: ${tx.to}`
        return (
            <>
                <Layout
                    headline="Confirm transaction"
                    description={description}
                    actions={{
                        reject: {
                            children: "Go back",
                            onClick: reject,
                        },
                    }}
                />
            </>
        )
    }

    return (
        <>
            <Layout
                headline="Confirm transaction"
                actions={{
                    accept: {
                        children: userBalance?.value && gasLimit ? "Confirm" : "Not enough funds!",
                        "aria-disabled": isConfirmActionDisabled,
                        onClick: () => {
                            if (isConfirmActionDisabled) return
                            accept({ method, params: [updatedTx] })
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
                                <SubsectionTitle>Sending amount</SubsectionTitle>
                                <FormattedDetailsLine>{formatted.value} HAPPY</FormattedDetailsLine>
                            </SubsectionContent>
                        )}
                    </SubsectionBlock>
                </SectionBlock>
                <SectionBlock>
                    <SubsectionBlock>
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
