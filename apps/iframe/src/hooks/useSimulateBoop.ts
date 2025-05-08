import type { Address } from "@happy.tech/common"
import { useQuery } from "@tanstack/react-query"
import { entryPoint } from "#src/constants/contracts"
import { boopFromTransaction } from "#src/requests/utils/boop"
import type { ValidRpcTransactionRequest } from "#src/requests/utils/checks"
import { boopClient } from "#src/state/boopClient"

type SimulateBoopArgs = {
    userAddress: Address | undefined
    tx: ValidRpcTransactionRequest
}

export function useSimulateBoop({ userAddress, tx }: SimulateBoopArgs) {
    return useQuery({
        queryKey: ["simulate-boop", userAddress, tx],
        queryFn: async () => {
            const boop = await boopFromTransaction(userAddress!, tx!)
            return await boopClient.simulate({ entryPoint, boop })
        },
        enabled: !!userAddress && !!tx,
    })
}
