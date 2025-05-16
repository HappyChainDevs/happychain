import { Simulate, type SimulateSuccess } from "@happy.tech/boop-sdk"
import { type Address, getProp } from "@happy.tech/common"
import { useQuery } from "@tanstack/react-query"
import type { RpcTransactionRequest } from "viem"
import { entryPoint } from "#src/constants/contracts"
import { boopFromTransaction } from "#src/requests/utils/boop"
import type { ValidRpcTransactionRequest } from "#src/requests/utils/checks"
import { getBoopClient } from "#src/state/boopClient"

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
    if (!boopClient) throw new Error("Boop client not initialized")

    const filledTx = tx.to
        ? ({
              ...tx,
              to: tx.to,
              from: (tx.from ?? userAddress) as Address,
          } satisfies ValidRpcTransactionRequest)
        : undefined

    const {
        data,
        error,
        isPending: isSimulatePending,
    } = useQuery({
        queryKey: ["boop-simulate"],
        enabled: !!userAddress && enabled,
        queryFn: async () => {
            const boop = await boopFromTransaction(userAddress!, filledTx!)
            return await boopClient.simulate({ entryPoint, boop })
        },
    })

    return {
        simulateOutput: data?.status === Simulate.Success ? data : undefined,
        simulateError:
            error ??
            (data && data.status !== Simulate.Success //
                ? new Error(getProp(data, "description", "string"))
                : undefined),
        isSimulatePending,
    }
}
