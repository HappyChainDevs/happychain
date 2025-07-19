import { getCurrentChain } from "#src/state/chains"
import { getPublicClient } from "#src/state/publicClient"
import { getUser } from "#src/state/user"
import { getWalletClient } from "#src/state/walletClient"

/**
 * TODO: pick reasonable timeframe for this check. 1 second is likely much to fast
 */
const HEALTH_CHECK_INTERVAL = 1000

/**
 * HealthCheckService routinely checks if the public client, wallet client, and injected client
 * are connected to the correct & expected chain.
 *
 * TODO: if an error arises, we should try to correct and/or display connection issues in the wallet
 * TODO: we should differentiate between offline, and wrong chain
 */
export class HealthCheckService {
    static #_instance: HealthCheckService

    #interval: NodeJS.Timeout | undefined = undefined

    private constructor() {}

    public static get instance(): HealthCheckService {
        HealthCheckService.#_instance ??= new HealthCheckService()
        return HealthCheckService.#_instance
    }

    /**
     * Stop monitoring web3 connections
     */
    public static stop(): void {
        clearInterval(HealthCheckService.instance.#interval)
        HealthCheckService.instance.#interval = undefined
    }

    /**
     * Begin monitoring web3 connections
     */
    public static start(): void {
        clearInterval(HealthCheckService.instance.#interval)
        HealthCheckService.instance.#interval = setInterval(() => {
            void HealthCheckService.instance.#check().catch((e) => {
                console.error("Health check failed", e)
            })
        }, HEALTH_CHECK_INTERVAL)
    }

    async #check() {
        const user = getUser()
        const chain = getCurrentChain()
        const chainId = Number(chain.chainId)

        const publicClient = getPublicClient()
        const walletClient = user ? getWalletClient() : undefined

        const [publicClientChain, connectedChainId] = await Promise.all([
            publicClient.getChainId(),
            walletClient?.getChainId(),
        ])

        if (publicClientChain !== chainId)
            console.warn(
                `Public Chain mismatch. PublicClient is connected to chain: ${publicClientChain}, but expected ${chainId}`,
            )
        if (user && connectedChainId !== chainId)
            console.warn(
                `Connected Chain mismatch. WalletClient is connected to chain: ${connectedChainId}, but expected ${chainId}`,
            )
    }
}
