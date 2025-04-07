import { accessorsFromAtom } from "@happy.tech/common"
import { abis as happyAccAbsAbis, deployment as happyAccAbsDeployment } from "@happy.tech/contracts/happy-aa/anvil"
import { computeBoopHash, estimateGas, execute, state, submit } from "@happy.tech/submitter-client"
import { type Atom, atom } from "jotai"
import {
    type Account,
    type Address,
    type Chain,
    type Client,
    type Hash,
    type Hex,
    type Transport,
    encodeFunctionData,
    zeroAddress,
} from "viem"
import { getBoopAccount } from "./boopAccount"
import { currentChainAtom } from "./chains"
import { getPublicClient } from "./publicClient"
import { walletClientAtom } from "./walletClient"

import type { Result } from "../../../../packages/submitter-client/lib/utils/neverthrow"
// @todo - cleanup imports later x_x
import type { HappyTx } from "../../../../packages/submitter/lib/tmp/interface/HappyTx"
import { EntryPointStatus } from "../../../../packages/submitter/lib/tmp/interface/status"
import type { EstimateGasOutput } from "../../../../packages/submitter/lib/tmp/interface/submitter_estimateGas"
import type { ExecuteOutput } from "../../../../packages/submitter/lib/tmp/interface/submitter_execute"
import type { StateRequestOutput } from "../../../../packages/submitter/lib/tmp/interface/submitter_state"
import type { SubmitOutput } from "../../../../packages/submitter/lib/tmp/interface/submitter_submit"

async function getNonce(account: Address, nonceTrack = 0n): Promise<bigint> {
    const publicClient = getPublicClient()
    return await publicClient.readContract({
        address: happyAccAbsDeployment.HappyEntryPoint,
        abi: happyAccAbsAbis.HappyEntryPoint,
        functionName: "nonceValues",
        args: [account, nonceTrack],
    })
}

export interface BoopActions {
    prepareTransaction: (params: {
        dest: Address
        callData:
            | Hex
            | {
                  abi: Array<any> | Record<string, any>
                  functionName: string
                  args: Array<unknown>
              }
        value?: bigint
        paymaster?: Address
        nonceTrack?: bigint
        maxFeePerGas?: bigint
        submitterFee?: bigint
    }) => Promise<HappyTx>
    signTransaction: (tx: HappyTx) => Promise<HappyTx>
    submit: (tx: HappyTx, entryPoint?: Address) => Promise<Result<SubmitOutput, Error>>
    execute: (tx: HappyTx, entryPoint?: Address) => Promise<Result<ExecuteOutput, Error>>
    estimateGas: (tx: HappyTx, entryPoint?: Address) => Promise<Result<EstimateGasOutput, Error>>
    getStatus: (hash: Hex) => Promise<Result<StateRequestOutput, Error>>
    sendTransaction: (params: {
        dest: Address
        callData:
            | Hex
            | {
                  abi: Array<any> | Record<string, any>
                  functionName: string
                  args: Array<unknown>
              }
        value?: bigint
        paymaster?: Address
        nonceTrack?: bigint
        estimateGas?: boolean
    }) => Promise<Result<ExecuteOutput, Error>>
}

/**
 * Augments a wallet client with Boop account abstraction features
 *
 * @example
 * ```ts
 * const walletClient = createWalletClient({
 *   account,
 *   transport
 * });
 *
 * const boopClient = walletClient.extend(
 *   boopify({
 *     entryPoint: "0x1234...5678"
 *   })
 * )
 *
 * const tx = await boopClient.boop.prepareTransaction({
 *   dest: "0xabcd...ef01",
 *   callData: "0x..."
 * });
 *
 * const signedTx = await boopClient.boop.signTransaction(tx);
 * const result = await boopClient.boop.execute(signedTx);
 * ```
 */
function boopify(options: {
    entryPoint: Address
}) {
    const { entryPoint } = options

    return (client: any) => {
        return {
            ...client,
            // Scope the the Boop functionalities to a `boop` namespace
            // To access functions, you'd need to do :
            // myBoopClient.boop.<function name>
            // eg: myBoopClient.boop.prepareTransaction(...)
            boop: {
                async prepareTransaction({
                    dest,
                    callData,
                    value = 0n,
                    paymaster = zeroAddress,
                    nonceTrack = 0n,
                    maxFeePerGas = 1200000000n,
                    submitterFee = 100n,
                }: {
                    dest: Address
                    callData: Hex | { abi: any; functionName: string; args: Array<any> }
                    value?: bigint
                    paymaster?: Address
                    nonceTrack?: bigint
                    maxFeePerGas?: bigint
                    submitterFee?: bigint
                }) {
                    const boopAccount = await getBoopAccount()
                    if (!boopAccount) throw new Error("Boop account not initialized")
                    const nonceValue = await getNonce(boopAccount.address, nonceTrack)
                    const processedCallData =
                        typeof callData === "string"
                            ? callData
                            : (encodeFunctionData({
                                  abi: callData.abi,
                                  functionName: callData.functionName,
                                  args: callData.args,
                              }) as Hex)

                    const tx: HappyTx = {
                        account: boopAccount.address,
                        dest,
                        nonceTrack,
                        nonceValue,
                        value,
                        paymaster,
                        executeGasLimit: 0n,
                        gasLimit: 0n,
                        maxFeePerGas,
                        submitterFee,
                        callData: processedCallData,
                        paymasterData: "0x" as Hex,
                        validatorData: "0x" as Hex,
                        extraData: "0x" as Hex,
                    }

                    return tx
                },

                async signTransaction(tx: HappyTx) {
                    const happyTxHash = computeBoopHash(tx)
                    const validatorData = await client.signMessage({
                        message: { raw: happyTxHash },
                    })

                    return {
                        ...tx,
                        validatorData,
                    }
                },

                async submit(tx: HappyTx, customEntryPoint: Address = entryPoint) {
                    const result = await submit({
                        entryPoint: customEntryPoint,
                        tx: tx,
                    })

                    return result
                },

                async execute(tx: HappyTx, customEntryPoint: Address = entryPoint) {
                    const result = await execute({
                        entryPoint: customEntryPoint,
                        tx: tx,
                    })

                    return result
                },

                async estimateGas(tx: HappyTx, customEntryPoint: Address = entryPoint) {
                    const result = await estimateGas({
                        entryPoint: customEntryPoint,
                        tx: tx,
                    })

                    return result
                },

                async getStatus(hash: Hash) {
                    return await state({ hash })
                },

                async sendTransaction({
                    dest,
                    callData,
                    value = 0n,
                    paymaster = zeroAddress,
                    nonceTrack = 0n,
                    estimateGas: shouldEstimateGas = false,
                }: {
                    dest: Address
                    callData: Hex | { abi: any; functionName: string; args: Array<any> }
                    value?: bigint
                    paymaster?: Address
                    nonceTrack?: bigint
                    estimateGas?: boolean
                }) {
                    let tx = await this.prepareTransaction({
                        dest,
                        callData,
                        value,
                        paymaster,
                        nonceTrack,
                    })

                    if (shouldEstimateGas) {
                        const gasEstimation = await this.estimateGas(tx)

                        if (gasEstimation.isErr()) {
                            throw new Error(gasEstimation.error.name)
                        }

                        const estimationValue = gasEstimation.value

                        if (estimationValue.status === EntryPointStatus.Success) {
                            tx = {
                                ...tx,
                                gasLimit: BigInt(estimationValue.gasLimit),
                                executeGasLimit: BigInt(estimationValue.executeGasLimit),
                                maxFeePerGas: BigInt(estimationValue.maxFeePerGas),
                                submitterFee: BigInt(estimationValue.submitterFee),
                            }
                        } else {
                            throw new Error(`Gas estimation failed with status : ${estimationValue.status}`)
                        }
                    }

                    const signedTx = await this.signTransaction(tx)

                    return await this.execute(signedTx)
                },
            },
        }
    }
}

export type BoopWalletClient = Client<Transport, Chain | undefined, Account | undefined> & { boop: BoopActions }
export const boopClientAtom: Atom<BoopWalletClient | undefined> = atom((get) => {
    const walletClient = get(walletClientAtom)
    const currentChain = get(currentChainAtom)

    if (!walletClient || !currentChain) return undefined

    // Boopify wallet client
    const boopClient = walletClient.extend(
        boopify({
            entryPoint: happyAccAbsDeployment.HappyEntryPoint as Address,
        }),
    ) as unknown as BoopWalletClient

    return boopClient
})

export const { getValue: getBoopClient } = accessorsFromAtom(boopClientAtom)
