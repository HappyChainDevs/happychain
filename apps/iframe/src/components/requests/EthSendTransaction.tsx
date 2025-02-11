import { TransactionType, toBigIntSafe } from "@happy.tech/common"
import { deployment as contractAddresses } from "@happy.tech/contracts/account-abstraction/sepolia"
import { useAtomValue } from "jotai"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
    type AbiFunction,
    type Address,
    type Block,
    type Hex,
    type RpcTransactionRequest,
    decodeFunctionData,
    formatEther,
    formatGwei,
    formatUnits,
    hexToBigInt,
    isAddress,
} from "viem"
import type { PrepareUserOperationParameters, PrepareUserOperationReturnType } from "viem/account-abstraction"
import { useAsyncOperation } from "#src/hooks/useAsyncOperation"
import { abiContractMappingAtom } from "#src/state/loadedAbis"
import { publicClientAtom } from "#src/state/publicClient"
import { type ExtendedSmartAccountClient, smartAccountClientAtom } from "#src/state/smartAccountClient"
import { userAtom } from "#src/state/user"
import { getAppURL } from "#src/utils/appURL"
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

export enum GasFieldName {
    MaxFeePerGas = "MaxFeePerGas",
    MaxPriorityFeePerGas = "MaxPriorityFeePerGas",
    PreVerificationGas = "PreVerificationGas",
    VerificationGasLimit = "VerificationGasLimit",
    CallGasLimit = "CallGasLimit",
}

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
    const tx: RpcTransactionRequest = params[0]

    const user = useAtomValue(userAtom)
    const recordedAbisForUser = useAtomValue(abiContractMappingAtom)
    const publicClient = useAtomValue(publicClientAtom)

    const targetContractAddress = tx.to && isAddress(tx.to) ? tx.to : undefined
    const appURL = getAppURL()

    // get and store block data
    const [blockData, setBlockData] = useState<Block | undefined>(undefined)

    useEffect(() => {
        const fetchBlock = async () => {
            const block = await publicClient.getBlock()
            setBlockData(block)
        }
        void fetchBlock()
    }, [publicClient])

    // ====================================== UserOp details ======================================
    const prepareUserOp = useCallback(
        async (smartAccountClient: ExtendedSmartAccountClient) => {
            try {
                return (await smartAccountClient.prepareUserOperation({
                    account: smartAccountClient.account,
                    paymaster: contractAddresses.HappyPaymaster as Address,
                    parameters: ["factory", "fees", "gas", "signature"],
                    calls: [
                        {
                            to: tx.to,
                            data: tx.data,
                            value: tx.value ? hexToBigInt(tx.value as Hex) : 0n,
                        },
                    ],
                    nonce: 0n,
                    paymasterData: undefined,
                } satisfies PrepareUserOperationParameters)) as PrepareUserOperationReturnType
            } catch (error) {
                console.error("Failed to prepare operation:", error)
                return undefined
            }
        },
        [tx],
    )

    const { data: preparedUserOp, loading, error } = useAsyncOperation(smartAccountClientAtom, prepareUserOp)
    // const { account: _, ...rest } = preparedUserOp

    // ====================================== Contract ABI details ======================================
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
    const formattedTxInfo = useMemo(() => {
        if (!preparedUserOp || !blockData) return undefined

        // Calculate gasFee (min of maxFeePerGas and maxPriorityFeePerGas + baseFee)
        const maxFeePerGas = toBigIntSafe(preparedUserOp.maxFeePerGas)
        const maxPriorityFeePerGas = toBigIntSafe(preparedUserOp.maxPriorityFeePerGas)
        const baseFee = toBigIntSafe(blockData.baseFeePerGas)

        const gasFee = maxFeePerGas < maxPriorityFeePerGas + baseFee ? maxFeePerGas : maxPriorityFeePerGas + baseFee

        // Calculate gasUsed (sum of all gas components)
        const gasUsed =
            toBigIntSafe(preparedUserOp.preVerificationGas) +
            toBigIntSafe(preparedUserOp.verificationGasLimit) +
            toBigIntSafe(preparedUserOp.callGasLimit)

        const estimatedGasCost = gasFee * gasUsed

        return {
            value: formatEther(toBigIntSafe(tx.value)),
            type: classifyTxType(tx),
            preVerificationGas: formatGwei(toBigIntSafe(preparedUserOp.preVerificationGas)),
            verificationGasLimit: formatGwei(toBigIntSafe(preparedUserOp.verificationGasLimit)),
            callGasLimit: formatGwei(toBigIntSafe(preparedUserOp.callGasLimit)),
            maxFeePerGas: formatGwei(maxFeePerGas),
            maxPriorityFeePerGas: formatGwei(maxPriorityFeePerGas),
            estimatedGas: formatUnits(estimatedGasCost, 18),
        }
    }, [preparedUserOp, tx, blockData])

    return (
        <>
            <Layout
                headline={<>Confirm transaction</>}
                hideActions={tx.type === TransactionType.EIP4844}
                actions={{
                    accept: {
                        children: loading ? "Preparing..." : "Confirm",
                        disabled: loading || Boolean(error) || !preparedUserOp,
                        onClick: () => {
                            if (loading || !preparedUserOp) return
                            accept({
                                eip1193params: { method, params },
                                extraData: preparedUserOp,
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

                                <SubsectionContent>
                                    <SubsectionTitle>Amount</SubsectionTitle>
                                    <FormattedDetailsLine>{formattedTxInfo?.value} HAPPY</FormattedDetailsLine>
                                </SubsectionContent>
                            </SubsectionBlock>
                        </SectionBlock>
                        <SectionBlock>
                            <SubsectionBlock>
                                <SubsectionContent>
                                    <SubsectionTitle>Transaction type</SubsectionTitle>
                                    <FormattedDetailsLine>{formattedTxInfo?.type}</FormattedDetailsLine>
                                </SubsectionContent>
                                <SubsectionContent>
                                    <SubsectionTitle>{GasFieldName.MaxFeePerGas}</SubsectionTitle>
                                    <FormattedDetailsLine>{formattedTxInfo?.maxFeePerGas}</FormattedDetailsLine>
                                </SubsectionContent>
                                <SubsectionContent>
                                    <SubsectionTitle>{GasFieldName.MaxPriorityFeePerGas}</SubsectionTitle>
                                    <FormattedDetailsLine>{formattedTxInfo?.maxPriorityFeePerGas}</FormattedDetailsLine>
                                </SubsectionContent>
                                <SubsectionContent>
                                    <SubsectionTitle>{GasFieldName.PreVerificationGas}</SubsectionTitle>
                                    <FormattedDetailsLine>{formattedTxInfo?.preVerificationGas}</FormattedDetailsLine>
                                </SubsectionContent>
                                <SubsectionContent>
                                    <SubsectionTitle>{GasFieldName.VerificationGasLimit}</SubsectionTitle>
                                    <FormattedDetailsLine>{formattedTxInfo?.verificationGasLimit}</FormattedDetailsLine>
                                </SubsectionContent>
                                <SubsectionContent>
                                    <SubsectionTitle>{GasFieldName.CallGasLimit}</SubsectionTitle>
                                    <FormattedDetailsLine>{formattedTxInfo?.callGasLimit}</FormattedDetailsLine>
                                </SubsectionContent>
                                <SubsectionContent>
                                    <SubsectionTitle>{"Estimated Gas:"}</SubsectionTitle>
                                    <FormattedDetailsLine>{formattedTxInfo?.estimatedGas}</FormattedDetailsLine>
                                </SubsectionContent>
                            </SubsectionBlock>
                        </SectionBlock>
                    </TabContent>
                    <TabContent value={RequestTabsValues.Raw}>
                        <SectionBlock>
                            <SubsectionBlock>
                                {decodedData && <DecodedData data={decodedData} />}
                                <FormattedDetailsLine isCode>{JSON.stringify(params, null, 2)}</FormattedDetailsLine>
                            </SubsectionBlock>
                        </SectionBlock>
                    </TabContent>
                </Tabs>
                {tx.type === TransactionType.EIP4844 && (
                    <SectionBlock>
                        <BlobTxWarning onReject={reject} />
                    </SectionBlock>
                )}
            </Layout>
        </>
    )
}
