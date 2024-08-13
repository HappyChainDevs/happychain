import { type ReactNode, useEffect, useState } from 'react'

import { init as web3AuthInit } from '@happychain/firebase-web3auth-strategy'
import { type EIP1193EventName, logger } from '@happychain/sdk-shared'
import { requiresApproval } from '@happychain/sdk-shared/lib/services/permissions'
import { useAtomValue } from 'jotai'

import { useHappyAccount } from '../hooks/useHappyAccount'
import { dappMessageBus, happyProviderBus, popupBus } from '../services/eventBus'
import { providerAtom, publicClientAtom, walletClientAtom } from '../services/provider'

export function HappyAccountProvider({ children }: { children: ReactNode }) {
    const { user: happyUser } = useHappyAccount()
    const provider = useAtomValue(providerAtom)
    const publicClient = useAtomValue(publicClientAtom)
    const walletClient = useAtomValue(walletClientAtom)
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        const init = async () => {
            await web3AuthInit()
            setIsLoaded(true)
            logger.log('Web3Auth is initialized')
        }
        init()
    }, [])

    useEffect(() => {
        dappMessageBus.emit('auth-changed', happyUser)
    }, [happyUser])

    useEffect(() => {
        const proxyEvent = (name: EIP1193EventName) => (event: unknown) => {
            happyProviderBus.emit('provider:event', {
                payload: { event: name, args: event },
            })
        }

        const connectCallback = proxyEvent('connect')
        const disconnectCallback = proxyEvent('disconnect')
        const chainChangedCallback = proxyEvent('chainChanged')
        const accountsChangedCallback = proxyEvent('accountsChanged')

        provider?.on('connect', connectCallback)
        provider?.on('disconnect', disconnectCallback)
        provider?.on('chainChanged', chainChangedCallback)
        provider?.on('accountsChanged', accountsChangedCallback)

        return () => {
            provider?.removeListener('connect', connectCallback)
            provider?.removeListener('disconnect', disconnectCallback)
            provider?.removeListener('chainChanged', chainChangedCallback)
            provider?.removeListener('accountsChanged', accountsChangedCallback)
        }
    }, [provider])

    // trusted requests may only be sent from same-origin (popup approval screen)
    // and can be sent through the walletClient
    useEffect(() => {
        const offApprove = popupBus.on('request:approve', async (payload) => {
            try {
                const result = await walletClient?.request(payload.payload as Parameters<typeof walletClient.request>)

                happyProviderBus.emit('response:complete', {
                    key: payload.key,
                    error: null,
                    payload: result,
                })
            } catch (e) {
                console.error(e)
                console.error('error executing request', payload)
            }
        })
        const offReject = popupBus.on('request:reject', (payload) => {
            happyProviderBus.emit('response:complete', payload)
        })
        return () => {
            offApprove()
            offReject()
        }
    }, [walletClient])

    // Untrusted requests can only be called using the public client
    // as they bypass the popup approval screen
    useEffect(() => {
        const offApprove = happyProviderBus.on('request:approve', async (data) => {
            try {
                const isPublicMethod = !requiresApproval(data.payload)

                if (!isPublicMethod) {
                    // emit not allowed error
                    console.warn('can not execute untrusted request', data)
                    return
                }

                // injected providers are allowed to bypass the popup screen
                // as they have their own in-built popup security model

                const result = await publicClient.request(data.payload as Parameters<typeof publicClient.request>)

                happyProviderBus.emit('response:complete', {
                    key: data.key,
                    error: null,
                    payload: result,
                })
            } catch (e) {
                console.error(e)
                console.error('error executing request', data)
            }
        })
        return () => {
            offApprove()
        }
    }, [publicClient])

    if (!isLoaded) {
        return null
    }
    return children
}
