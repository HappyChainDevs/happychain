import { googleLogo } from "@happychain/common"
import { type ConnectionProvider, type HappyUser, WalletType } from "@happychain/sdk-shared"
import { useLoginWithOAuth, useLogout, usePrivy, useWallets } from "@privy-io/react-auth"
import { useCallback, useEffect, useMemo } from "react"
import type { EIP1193Provider } from "viem"

const authChangeCallbacks = new Set<(user: HappyUser | undefined, provider: EIP1193Provider | undefined) => void>()
export function usePrivyStrategy() {
    const { user } = usePrivy()
    const { ready, wallets } = useWallets()

    const { initOAuth } = useLoginWithOAuth()

    useEffect(() => {
        if (!ready) {
            return
        }

        const nextUser: HappyUser | undefined =
            ready && user?.id
                ? ({
                      // connection type
                      type: WalletType.Social,
                      provider: "privy",
                      // social details
                      uid: user?.id,
                      email: user?.google?.email || "",
                      name: user?.google?.name || "",
                      ens: "",
                      avatar: `https://unavatar.io/${user?.google?.email}?ttl=1h`,
                      // web3 details
                      address: user?.wallet?.address as `0x${string}`,
                      addresses: wallets.map((a) => a.address as `0x${string}`),
                  } satisfies HappyUser)
                : undefined

        const runAll = async () => {
            const provider = await wallets.find((a) => a.address === user?.wallet?.address)?.getEthereumProvider()

            for (const call of authChangeCallbacks) {
                call(nextUser, provider as EIP1193Provider)
            }
        }
        runAll()
    }, [user, ready, wallets])

    const { logout } = useLogout()

    const signIn = useCallback(
        async (provider: "google") => {
            try {
                await initOAuth({ provider })
            } catch (err) {
                console.log({ err })
                // Handle errors due to network availability, captcha failure, or input validation here
            }
        },
        [initOAuth],
    )

    const providers = useMemo(
        () =>
            [
                {
                    type: "social",
                    id: "privy:google",
                    name: "Google",
                    icon: googleLogo,
                    enable: () => signIn("google"),
                    disable: () => logout(),
                },
            ] as ConnectionProvider[],
        [signIn, logout],
    )

    return {
        providers: providers,
        onAuthChange: (callback: (user: HappyUser | undefined, provider: EIP1193Provider | undefined) => void) => {
            authChangeCallbacks.add(callback)
            return () => {
                authChangeCallbacks.delete(callback)
            }
        },
    }
}
