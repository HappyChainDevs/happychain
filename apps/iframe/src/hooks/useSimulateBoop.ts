import type { Address } from "@happy.tech/common"
import { useQuery } from "@tanstack/react-query"
import { entryPoint } from "#src/constants/contracts"
import { boopFromTransaction } from "#src/requests/utils/boop"
import type { ValidRpcTransactionRequest } from "#src/requests/utils/checks"
import { boopClient } from "#src/state/boopClient"

export type UseSimulateBoopArgs = {
    userAddress: Address | undefined
    tx: ValidRpcTransactionRequest | undefined
    enabled: boolean
}

export type UseSimulateBoopReturn = {
    simulatedBoopData: Awaited<ReturnType<typeof boopClient.simulate>> | undefined
    isSimulationPending: boolean
    isSimulationError: boolean
    simulationQueryKey: readonly unknown[]
}

export function useSimulateBoop({ userAddress, tx, enabled }: UseSimulateBoopArgs): UseSimulateBoopReturn {
    const simulationQueryKey = [Symbol("simulate-boop"), userAddress, tx] as const
    const shouldQuery = !!userAddress && !!tx && enabled

    const {
        data: simulatedBoopData,
        isPending: isSimulationPending,
        isError: isSimulationError,
    } = useQuery({
        queryKey: simulationQueryKey,
        enabled: shouldQuery,
        queryFn: async () => {
            const boop = await boopFromTransaction(userAddress!, tx!)
            return boopClient.simulate({ entryPoint, boop })
        },
    })

    return {
        simulatedBoopData,
        isSimulationPending,
        isSimulationError,
        simulationQueryKey,
    }
}
