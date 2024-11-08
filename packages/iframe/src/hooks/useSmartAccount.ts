import { useAtomValue } from "jotai"
import { useCallback, useEffect } from "react"
import { getSmartAccount } from "#src/state/smartAccount"
import { walletClientAtom } from "#src/state/walletClient"
import { getUser } from "../state/user"

// this is still a WIP, definitely not a final approach
export function useSmartAccount() {
    const walletClient = useAtomValue(walletClientAtom)
     // might want to try using tanstack here since we probably want to track loading/error/success states too
    const initialize = useCallback(async () => {
        const user = getUser()
        if (!walletClient?.account || !user) {
            return
        }

        try {       
            const kernelAccount = await getSmartAccount() // failing for now -> check web3auth.sw 
            if (!kernelAccount) {
                throw new Error('Failed to create kernel account')
            }

            const smartAccountAddress = await kernelAccount.getAddress()
            console.debug("[useSmartAccount] smartAccountAddress", smartAccountAddress)
            console.debug("[useSmartAccount] walletClient.account.address", walletClient.account.address)
            // @todo -  assign smart account address to connected user in state
        } catch (error) {
            console.debug("[useSmartAccount] Error initializing smart account:", error)
        }
    }, [walletClient])

    useEffect(() => {
        void initialize()
    }, [initialize])

    return {
        retry: initialize
    }
}