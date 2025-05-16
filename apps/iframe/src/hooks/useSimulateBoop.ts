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
 * Creates a stable, serializable query key from a transaction request
 * Extracts only relevant properties and converts BigInt values to strings
 * @param tx The transaction request to create a key from
 * @returns A stable object suitable for use in a React Query key
 */
function serializeTransactionForQueryKey(tx?: ValidRpcTransactionRequest) {
    if (!tx) return undefined

    const { to, from, value, data, gas, gasPrice, maxFeePerGas, maxPriorityFeePerGas } = tx

    return {
        to,
        from,
        value: value?.toString(),
        data,
        gas: gas?.toString(),
        gasPrice: gasPrice?.toString(),
        maxFeePerGas: maxFeePerGas?.toString(),
        maxPriorityFeePerGas: maxPriorityFeePerGas?.toString(),
    }
}

/**
 * Query keys for all boop-related requests
 */
export const boopKeys = {
    /** Base key for all boop related requests */
    all: [Symbol("boop")] as const,

    /** Simulation related query keys */
    simulation: {
        /** Base key for all simulation related queries */
        all: () => [...boopKeys.all, "simulation"] as const,

        /** Key for transaction simulation */
        transaction: (userAddress: Address | undefined, tx: ValidRpcTransactionRequest) =>
            [...boopKeys.simulation.all(), userAddress, serializeTransactionForQueryKey(tx)] as const,
    },
}

/**
 * Hook to simulate a transaction using the boop client
 *
 * This hook:
 * 1. Creates a stable query key combining user address and serialized transaction
 * 2. Conditionally executes the simulation when enabled and required data is present
 * 3. Converts the regular transaction into a boop format and sends it for simulation
 * 4. Returns simulation status and results along with the query key for external operations
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
          } satisfies RpcTransactionRequest & { from: Address; to: Address })
        : undefined

    const {
        data,
        error,
        isPending: isSimulatePending,
    } = useQuery({
        queryKey: boopKeys.simulation.transaction(userAddress, filledTx!), // TODO
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
