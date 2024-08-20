import { type ReactNode, useCallback, useEffect, useState } from 'react'

import { init as web3AuthInit } from '@happychain/firebase-web3auth-strategy'
import { type EIP1193EventName, type EIP1193ProxiedEvents, logger } from '@happychain/sdk-shared'
import { requiresApproval } from '@happychain/sdk-shared/lib/services/permissions'
import { useAtom, useAtomValue } from 'jotai'
import { happyProviderBus, popupBus } from '../services/eventBus'
import { providerAtom, publicClientAtom, walletClientAtom } from '../services/provider'
import { chainsAtom } from '../state/chains'
import { isAddChainParams } from '../utils/isAddChainParam'

const iframeUUID = new URLSearchParams(window.location.search).get('uuid')

const checkRequestUUID = (uuid: ReturnType<typeof crypto.randomUUID>) => uuid === iframeUUID

export function HappyAccountProvider({ children }: { children: ReactNode }) {
    const provider = useAtomValue(providerAtom)
    const publicClient = useAtomValue(publicClientAtom)
    const walletClient = useAtomValue(walletClientAtom)
    const [chains, setChains] = useAtom(chainsAtom)
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

    const requiresConfirmation = useCallback(
        (payload: EIP1193ProxiedEvents['permission-check:request']['payload']) => {
            const basicCheck = requiresApproval(payload)
            //  if the basic check shows its a safe method, we can stop here, and report back
            if (basicCheck === false) {
                return false
            }

            // only request to add new chains require confirmation
            if (payload.method === 'wallet_addEthereumChain') {
                const params =
                    typeof payload.params === 'object' && Array.isArray(payload.params) && payload.params?.[0]

                return !isAddChainParams(params) || !chains.some((chain) => chain.chainId === params.chainId)
            }

            return true
        },
        [chains],
    )

    useEffect(() => {
        return happyProviderBus.on('permission-check:request', (data) => {
            const result = requiresConfirmation(data.payload)
            return happyProviderBus.emit('permission-check:response', {
                key: data.key,
                uuid: data.uuid,
                error: null,
                payload: result,
            })
        })
    }, [requiresConfirmation])

    // trusted requests may only be sent from same-origin (popup approval screen)
    // and can be sent through the walletClient
    useEffect(() => {
        const offApprove = popupBus.on('request:approve', async (data) => {
            // wrong window, ignore
            if (checkRequestUUID(data.uuid)) return

            try {
                const result = await walletClient?.request(data.payload as Parameters<typeof walletClient.request>)

                if (data.payload.method === 'wallet_addEthereumChain') {
                    const params =
                        typeof data.payload.params === 'object' &&
                        Array.isArray(data.payload.params) &&
                        data.payload.params?.[0]

                    if (isAddChainParams(params)) {
                        setChains((previous) => [...previous, params])
                    }
                }

                happyProviderBus.emit('response:complete', {
                    key: data.key,
                    uuid: data.uuid,
                    error: null,
                    payload: result,
                })
            } catch (e) {
                console.error(e)
                console.error('error executing request', data)
            }
        })
        const offReject = popupBus.on('request:reject', (data) => {
            if (checkRequestUUID(data.uuid)) return
            happyProviderBus.emit('response:complete', data)
        })
        return () => {
            offApprove()
            offReject()
        }
    }, [walletClient, setChains])

    // Untrusted requests can only be called using the public client
    // as they bypass the popup approval screen
    useEffect(() => {
        const offApprove = happyProviderBus.on('request:approve', async (data) => {
            if (checkRequestUUID(data.uuid)) return
            try {
                const isPublicMethod = !requiresConfirmation(data.payload)

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
                    uuid: data.uuid,
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
    }, [publicClient, requiresConfirmation])

    if (!isLoaded) {
        return null
    }
    return children
}
