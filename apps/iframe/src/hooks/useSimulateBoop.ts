import { Onchain, Simulate, type SimulateSuccess } from "@happy.tech/boop-sdk"
import { type Address, bigIntReplacer } from "@happy.tech/common"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useRef } from "react"
import type { RpcTransactionRequest } from "viem"
import { entryPoint } from "#src/constants/contracts"
import { boopFromTransaction } from "#src/requests/utils/boop"
import type { ValidRpcTransactionRequest } from "#src/requests/utils/checks"
import { getBoopClient } from "#src/state/boopClient"
import { getAppURL } from "#src/utils/appURL"

export type UseSimulateBoopArgs = {
    userAddress: Address | undefined
    tx: RpcTransactionRequest
    enabled: boolean
}

export type UseSimulateBoopReturn = {
    simulateOutput: SimulateSuccess | undefined
    simulateError: Error | undefined
    isSimulatePending: boolean
}

/**
 * Hook to simulate a transaction using the boop client
 *
 * This hook:
 * - Conditionally executes the simulation when enabled and required data is present
 * - Converts the regular transaction into a boop format and sends it for simulation
 * - Returns simulation status and results
 *
 * @param userAddress The user's wallet address
 * @param tx The transaction request to simulate
 * @param enabled Flag to enable/disable the simulation query
 * @returns Simulation results, status flags, and query key
 */
export function useSimulateBoop({ userAddress, tx, enabled }: UseSimulateBoopArgs): UseSimulateBoopReturn {
    const boopClient = getBoopClient()

    const filledTx = tx.to
        ? ({
              ...tx,
              to: tx.to,
              from: (tx.from ?? userAddress) as Address,
          } satisfies ValidRpcTransactionRequest)
        : undefined

    const lastError = useRef<Error>(null)

    const boopQueryKey = useMemo(
        () => ["boop-from-tx", JSON.parse(JSON.stringify(filledTx, bigIntReplacer))],
        [filledTx],
    )
    // Fetch the boop once, but don't increment the nonce on repeat
    const { data: boop, refetch: incrementNonce } = useQuery({
        queryKey: boopQueryKey,
        queryFn: async () => await boopFromTransaction(userAddress!, filledTx!, getAppURL()),
        enabled: !!filledTx && enabled && !lastError.current,
        staleTime: Number.POSITIVE_INFINITY,
    })

    const simulateQueryKey = useMemo(() => ["simulate-boop", JSON.parse(JSON.stringify(tx, bigIntReplacer))], [tx])
    const {
        data,
        error,
        isPending: isSimulatePending,
    } = useQuery({
        queryKey: simulateQueryKey,
        enabled: boop && !!userAddress && enabled && !lastError.current,
        queryFn: async () => {
            if (!boop) throw new Error("Boop data is not available for simulation")
            const results = await boopClient.simulate({ entryPoint, boop })
            if (results.status === Onchain.InvalidNonce) incrementNonce()
            return results
        },
        // the refetches are only performed if the window is in focus,
        // else it's a constant stream of requests
        refetchInterval: 2000,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
    })
    lastError.current = error

    return {
        simulateOutput: data?.status === Simulate.Success ? data : undefined,
        simulateError: error ?? (data && data.status !== Simulate.Success ? new Error(data.error) : undefined),
        isSimulatePending,
    }
}
