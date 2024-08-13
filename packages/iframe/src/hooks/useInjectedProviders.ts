import { useCallback, useEffect, useMemo, useState } from 'react'

import type { ConnectionProvider, EIP6963AnnounceProviderEvent, EIP6963ProviderDetail } from '@happychain/sdk-shared'
import { useSetAtom } from 'jotai'

import { dappMessageBus } from '../services/eventBus'
import { storage } from '../services/storage'
import { AuthState, authStateAtom } from '../state/app'

import { setUserWithProvider } from './useHappyAccount'

function isEip6963Event(evt: Event): evt is EIP6963AnnounceProviderEvent {
    return Boolean(
        typeof evt === 'object' &&
            'detail' in evt &&
            typeof evt.detail === 'object' &&
            evt.detail &&
            'info' in evt.detail &&
            'provider' in evt.detail,
    )
}

type ProviderMap = Map<string, EIP6963ProviderDetail>

export function useInjectedProviders(): ConnectionProvider[] {
    const setAuthState = useSetAtom(authStateAtom)
    // user injected extensions
    const [injectedProviders, setInjectedProviders] = useState<ProviderMap>(new Map())

    useEffect(() => {
        return dappMessageBus.on('wallet-connect:response', ({ user }) => {
            setUserWithProvider(user, null)
        })
    }, [])
    //
    const enable = useCallback(async (eip1193Provider: EIP6963ProviderDetail) => {
        dappMessageBus.emit('wallet-connect:request', eip1193Provider.info.rdns)
    }, [])

    const disable = useCallback(async () => {
        dappMessageBus.emit('wallet-disconnect:request', null)
        setUserWithProvider(null, null)
    }, [])

    useEffect(() => {
        const callback = async (evt: Event) => {
            if (!isEip6963Event(evt)) return

            setInjectedProviders((map) => new Map(map.set(evt.detail.info.uuid, evt.detail)))

            // autoconnect
            const user = storage.get('cached-user')
            if (user?.provider === evt.detail.info.rdns) {
                enable(evt.detail)
            }
        }

        window.addEventListener('eip6963:announceProvider', callback)
        return () => window.removeEventListener('eip6963:announceProvider', callback)
    }, [enable])

    useEffect(() => {
        window.dispatchEvent(new CustomEvent('eip6963:requestProvider'))
    }, [])

    const providers = useMemo(
        () =>
            Array.from(injectedProviders.values()).map((eip1193Provider) => {
                return {
                    type: 'injected',
                    id: `injected:${eip1193Provider.info.rdns}`,
                    name: eip1193Provider.info.name,
                    icon: eip1193Provider.info.icon,
                    enable: async () => {
                        // will automatically disable loading state when user+provider are set
                        setAuthState(AuthState.Loading)
                        await enable(eip1193Provider)
                    },
                    disable: async () => {
                        // will automatically disable loading state when user+provider are set
                        setAuthState(AuthState.Loading)
                        await disable()
                    },
                    getProvider: () => eip1193Provider.provider,
                }
            }),
        [enable, disable, setAuthState, injectedProviders],
    )

    return providers
}
