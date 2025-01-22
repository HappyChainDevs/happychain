import { type EIP1193EventName, Msgs } from "@happy.tech/wallet-common"
import { useAtomValue } from "jotai"
import { useEffect } from "react"
import { iframeProvider } from "#src/wagmi/provider.js"
import { happyProviderBus } from "../services/eventBus"
import { providerAtom } from "../state/provider"

/**
 * Subscribes to the current internal provider and
 * forwards all requested events to be
 * emitted by the happyProvider on the app-side
 */
export function useProviderEventsProxy(events: EIP1193EventName[]) {
    const provider = useAtomValue(providerAtom)

    useEffect(() => {
        const proxyEvent = (name: EIP1193EventName) => (event: unknown) => {
            void iframeProvider.emit(name, event)

            void happyProviderBus.emit(Msgs.ProviderEvent, {
                payload: { event: name, args: event },
            })
        }

        const callbacks = events.map((name) => [name, proxyEvent(name)] as const)

        for (const [name, callback] of callbacks) {
            provider?.on(name, callback)
        }

        return () => {
            for (const [name, callback] of callbacks) {
                provider?.removeListener(name, callback)
            }
        }
    }, [provider, events])
}
