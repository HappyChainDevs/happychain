import { TransactionType, toBigIntSafe } from "@happy.tech/common"
import { deployment as contractAddresses } from "@happy.tech/contracts/account-abstraction/sepolia"
import { useMutation } from "@tanstack/react-query"
import { useAtomValue } from "jotai"
import { useEffect, useMemo, useState } from "react"
import {
    type AbiFunction,
    type Address,
    type Block,
    type Hex,
    type RpcTransactionRequest,
    decodeFunctionData,
    formatEther,
    hexToBigInt,
    isAddress,
} from "viem"
import type {
    PrepareUserOperationParameters,
    PrepareUserOperationReturnType,
    SmartAccount,
} from "viem/account-abstraction"
import { abiContractMappingAtom } from "#src/state/loadedAbis"
import { publicClientAtom } from "#src/state/publicClient"
import { getSmartAccountClient } from "#src/state/smartAccountClient"
import { userAtom } from "#src/state/user"
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
    EstimatedGas = "EstimatedGas",
    GasUsed = "GasUsed",
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
            // what we really (only) support
            return "UserOp"
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

    const {
        data: preparedUserOp,
        isPending,
        isError,
        mutate,
    } = useMutation({
        mutationFn: async () => {
            const smartAccountClient = (await getSmartAccountClient())!

            if (!smartAccountClient) {
                throw new Error("Smart account client not initialized")
            }

            const userOp = await smartAccountClient.prepareUserOperation({
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
            } satisfies PrepareUserOperationParameters)

            if (!userOp) {
                throw new Error("Failed to prepare user operation")
            }

            return userOp as PrepareUserOperationReturnType
        },
    })

    // biome-ignore lint/correctness/useExhaustiveDependencies: we want it to run when tx is populated
    useEffect(() => {
        mutate()
    }, [tx, mutate])

    const sanitizedUserOpData = useMemo(() => {
        if (!preparedUserOp) return undefined

        // Extract UserOperation data without the account field for acceptance.
        // We exclude the account since it's not part of the standard UserOperation type
        // and shouldn't be included in the final transaction submission - also causes a DataCloneError when
        // being sent through the event bus to the iframe.
        const { account: _, ...rest } = preparedUserOp as PrepareUserOperationReturnType & { account: SmartAccount }
        return rest
    }, [preparedUserOp])

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
    const formattedUserOpInfo = useMemo(() => {
        if (!preparedUserOp || !blockData) return undefined

        const { preVerificationGas, verificationGasLimit, callGasLimit, maxFeePerGas, maxPriorityFeePerGas } =
            preparedUserOp
        const baseFee = toBigIntSafe(blockData.baseFeePerGas)
        // Calculate gasFee (min of maxFeePerGas and maxPriorityFeePerGas + baseFee)
        const gasFee = maxFeePerGas < maxPriorityFeePerGas + baseFee ? maxFeePerGas : maxPriorityFeePerGas + baseFee
        // Calculate gasUsed (sum of all gas fields)
        const gasUsed = preVerificationGas + verificationGasLimit + callGasLimit
        const estimatedGasCost = gasFee * gasUsed

        return {
            value: formatEther(toBigIntSafe(tx.value)),
            type: classifyTxType(tx),
            preVerificationGas: String(preVerificationGas),
            verificationGasLimit: String(verificationGasLimit),
            callGasLimit: String(callGasLimit),
            maxFeePerGas: String(maxFeePerGas),
            maxPriorityFeePerGas: String(maxPriorityFeePerGas),
            estimatedGas: String(estimatedGasCost),
            gasUsed: String(gasUsed),
        }
    }, [preparedUserOp, tx, blockData])

    return (
        <>
            <Layout
                headline={<>Confirm transaction</>}
                hideActions={tx.type === TransactionType.EIP4844}
                actions={{
                    accept: {
                        children: isPending ? "Preparing..." : "Confirm",
                        disabled: isPending || isError || !preparedUserOp,
                        onClick: () => {
                            if (isPending || !preparedUserOp) return
                            accept({
                                eip1193RequestParams: { method, params },
                                extraData: sanitizedUserOpData,
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
                            <FormattedDetailsLine>{formattedUserOpInfo?.value} HAPPY</FormattedDetailsLine>
                        </SubsectionContent>
                    </SubsectionBlock>
                </SectionBlock>
                <SectionBlock>
                    <SubsectionBlock>
                        <SubsectionContent>
                            <SubsectionTitle>Transaction type</SubsectionTitle>
                            <FormattedDetailsLine>{formattedUserOpInfo?.type}</FormattedDetailsLine>
                        </SubsectionContent>
                        <SubsectionContent>
                            <SubsectionTitle>{GasFieldName.MaxFeePerGas}</SubsectionTitle>
                            <FormattedDetailsLine>{formattedUserOpInfo?.maxFeePerGas}</FormattedDetailsLine>
                        </SubsectionContent>
                        <SubsectionContent>
                            <SubsectionTitle>{GasFieldName.MaxPriorityFeePerGas}</SubsectionTitle>
                            <FormattedDetailsLine>{formattedUserOpInfo?.maxPriorityFeePerGas}</FormattedDetailsLine>
                        </SubsectionContent>
                        <SubsectionContent>
                            <SubsectionTitle>{GasFieldName.PreVerificationGas}</SubsectionTitle>
                            <FormattedDetailsLine>{formattedUserOpInfo?.preVerificationGas}</FormattedDetailsLine>
                        </SubsectionContent>
                        <SubsectionContent>
                            <SubsectionTitle>{GasFieldName.VerificationGasLimit}</SubsectionTitle>
                            <FormattedDetailsLine>{formattedUserOpInfo?.verificationGasLimit}</FormattedDetailsLine>
                        </SubsectionContent>
                        <SubsectionContent>
                            <SubsectionTitle>{GasFieldName.CallGasLimit}</SubsectionTitle>
                            <FormattedDetailsLine>{formattedUserOpInfo?.callGasLimit}</FormattedDetailsLine>
                        </SubsectionContent>
                        <SubsectionContent>
                            <SubsectionTitle>{GasFieldName.GasUsed}</SubsectionTitle>
                            <FormattedDetailsLine>{formattedUserOpInfo?.gasUsed}</FormattedDetailsLine>
                        </SubsectionContent>
                    </SubsectionBlock>
                </SectionBlock>

                <SectionBlock>
                    <SubsectionBlock>
                        {decodedData && <DecodedData data={decodedData} />}
                        <FormattedDetailsLine isCode>{JSON.stringify(params, null, 2)}</FormattedDetailsLine>
                    </SubsectionBlock>
                </SectionBlock>
                {tx.type === TransactionType.EIP4844 && (
                    <SectionBlock>
                        <BlobTxWarning onReject={reject} />
                    </SectionBlock>
                )}
            </Layout>
        </>
    )
}
