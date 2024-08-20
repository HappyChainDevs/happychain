import { useEffect, useMemo, useState } from 'react'

import type {
    ConnectionProvider,
    EIP6963AnnounceProviderEvent,
    EIP6963ProviderDetail,
    HappyUser,
} from '@happychain/sdk-shared'
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

const enable = async (eip1193Provider: EIP6963ProviderDetail) => {
    dappMessageBus.emit('injected-wallet:request', eip1193Provider.info.rdns)
}

const disable = async (eip1193Provider: EIP6963ProviderDetail) => {
    const past = ((): HappyUser | undefined => {
        try {
            const stored = localStorage.getItem('happychain:cached-user')
            return stored ? JSON.parse(stored) : undefined
        } catch {
            return
        }
    })()

    if (past?.provider === eip1193Provider.info.rdns) {
        dappMessageBus.emit('injected-wallet:request', undefined)
        setUserWithProvider(undefined, undefined)
    }
}

export function useInjectedProviders(): ConnectionProvider[] {
    const setAuthState = useSetAtom(authStateAtom)
    // user injected extensions
    const [injectedProviders, setInjectedProviders] = useState<ProviderMap>(new Map())

    useEffect(() => {
        return dappMessageBus.on('injected-wallet:response', ({ user }) => {
            setUserWithProvider(user, undefined)
        })
    }, [])
    //

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
    }, [])

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
                        await disable(eip1193Provider)
                    },
                }
            }),
        [setAuthState, injectedProviders],
    )

    return providers
}
