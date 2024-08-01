import { type ReactNode, useEffect, useState } from 'react'

import type { EIP1193EventName } from '@happychain/core'
import { init as web3AuthInit } from '@happychain/firebase-web3auth-strategy'
import { useAtomValue } from 'jotai'

import { userAtom } from '../hooks/useHappyAccount'
import { useInjectedProviders } from '../hooks/useInjectedProviders'
import { broadcastBus, eip1193providerBus, messageBus } from '../services/eventBus'
import { providerAtom, publicClientAtom, walletClientAtom } from '../services/provider'

export function HappyAccountProvider({ children }: { children: ReactNode }) {
    const happyUser = useAtomValue(userAtom)
    const provider = useAtomValue(providerAtom)
    const publicClient = useAtomValue(publicClientAtom)
    const walletClient = useAtomValue(walletClientAtom)
    const [isLoaded, setIsLoaded] = useState(false)

    const web3providers = useInjectedProviders()

    useEffect(() => {
        const init = async () => {
            await web3AuthInit()
            setIsLoaded(true)
            console.log('Web3Auth is initialized')
        }
        init()
    }, [])

    useEffect(() => {
        messageBus.emit('auth-changed', happyUser)
    }, [happyUser])

    useEffect(() => {
        const proxyEvent = (name: EIP1193EventName) => (event: unknown) => {
            eip1193providerBus.emit('provider:event', {
                payload: { event: name, args: event },
            })
        }

        const connectCallback = proxyEvent('connect')
        const disconnectCallback = proxyEvent('disconnect')
        const chainChangedCallback = proxyEvent('chainChanged')
        const accountsChangedCallback = proxyEvent('accountsChanged')

        provider.on('connect', connectCallback)
        provider.on('disconnect', disconnectCallback)
        provider.on('chainChanged', chainChangedCallback)
        provider.on('accountsChanged', accountsChangedCallback)

        return () => {
            provider.removeListener('connect', connectCallback)
            provider.removeListener('disconnect', disconnectCallback)
            provider.removeListener('chainChanged', chainChangedCallback)
            provider.removeListener('accountsChanged', accountsChangedCallback)
        }
    }, [provider])

    // trusted events may only be sent from same-origin (popup approval screen)
    useEffect(() => {
        const offApprove = broadcastBus.on('request:approve', async (payload) => {
            try {
                const result = await walletClient?.request(
                    payload.payload as Parameters<typeof walletClient.request>, // TODO: fix proper payload types instead of casting
                )

                eip1193providerBus.emit('provider:request:complete', {
                    key: payload.key,
                    error: null,
                    payload: result,
                })
            } catch (e) {
                // TODO: emit broken request error
                console.error(e)
                console.error('error executing request', payload)
            }
        })
        const offReject = broadcastBus.on('request:reject', (payload) => {
            eip1193providerBus.emit('provider:request:complete', payload)
        })
        return () => {
            offApprove()
            offReject()
        }
    }, [walletClient])

    // Untrusted requests can be called directly from the frontend and bypass the popup screen
    // host:iframe communication
    useEffect(() => {
        const offApprove = eip1193providerBus.on('request:approve', async (data) => {
            try {
                const isPublicMethod = ['eth_call', 'eth_getBlockByNumber'].includes(data.payload.method)

                const isInjected = happyUser?.type === 'injected'

                const injectedProvider = web3providers.find((i) => `injected:${isInjected}` === i.id)

                // TODO: use a proper list with shared config in the front
                if (!injectedProvider && !isPublicMethod) {
                    // emit not allowed error
                    console.warn('can not execute untrusted request', data)
                    return
                }

                // injected providers are allowed to bypass the popup screen
                // as they have their own in-built popup security model

                const result =
                    isInjected && walletClient
                        ? // TODO: fix with proper payload types
                          await walletClient.request(data.payload as Parameters<typeof walletClient.request>)
                        : await publicClient.request(data.payload as Parameters<typeof publicClient.request>)

                eip1193providerBus.emit('provider:request:complete', {
                    key: data.key,
                    error: null,
                    payload: result,
                })
            } catch (e) {
                // TODO: emit broken request error
                console.error(e)
                console.error('error executing request', data)
            }
        })
        return () => {
            offApprove()
        }
    }, [walletClient, publicClient, web3providers, happyUser])

    if (!isLoaded) {
        return null
    }
    return children
}
