import type { Address } from "@happy.tech/common"
import { useAtomValue } from "jotai/index"
import { useMemo } from "react"
import { type AbiFunction, type RpcTransactionRequest, decodeFunctionData } from "viem"
import { abiContractMappingAtom } from "#src/state/loadedAbis"

type UseTxDecodedDataArgs = {
    tx: RpcTransactionRequest
    txTo?: Address
    account?: Address
}

type UseTxDecodedDataReturn = {
    args: readonly unknown[] | undefined
    abiFuncDef: AbiFunction
}

/**
 * Looks up to see if there is a recorded ABI for the destination addres ({@link txTo}) and if so attempts decoding
 * the transaction's calldata according to the ABI, returning the results.
 */
export function useTxDecodedData({ tx, txTo, account }: UseTxDecodedDataArgs): UseTxDecodedDataReturn | undefined {
    const recordedAbisForUser = useAtomValue(abiContractMappingAtom)
    const abiForContract = account && txTo && recordedAbisForUser[account]?.[txTo]

    // Decodes the function call data for the given contract ABI and transaction data.
    return useMemo(() => {
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
}
