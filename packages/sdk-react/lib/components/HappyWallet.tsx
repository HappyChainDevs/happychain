import { memo, useEffect, useMemo, useState } from 'react'

import { config, type HappyUser } from '@happychain/core'
import { clsx } from 'clsx'

import { useHappyChain } from '../hooks/useHappyChain'
import { dappMessageBus } from '../services/eventBus'

const Iframe = memo(() => (
    <iframe
        title="happy-iframe"
        data-testid="happy-iframe"
        src={`${config.iframePath}/connect`}
        style={{ width: '100%', height: '100%' }}
    />
))

function getClasses(user: HappyUser | null, isOpen: boolean) {
    // not logged in, connect modal closed
    if (!user && !isOpen) {
        return 'hc-h-20 hc-w-28 hc-rounded-lg hc-overflow-hidden'
    }

    // not yet logged in, connect modal open
    if (!user && isOpen) {
        return 'hc-bottom-0 hc-left-0'
    }

    // logged in, modals closed
    if (user && !isOpen) {
        return 'hc-h-20 hc-w-52 hc-rounded-lg hc-overflow-hidden'
    }

    // logged in, modal open
    return 'hc-h-80 hc-w-80 hc-rounded-lg hc-overflow-hidden'
}

export function HappyWallet() {
    const [isOpen, setIsOpen] = useState(false)
    const { user } = useHappyChain()

    useEffect(() => {
        const off = dappMessageBus.on('modal-toggle', (state) => {
            setIsOpen(state)
        })
        return () => off()
    }, [])

    const iframeWrapperClasses = useMemo(() => getClasses(user, isOpen), [user, isOpen])

    return (
        <>
            <div className={clsx('hc-fixed hc-right-0 hc-top-0', iframeWrapperClasses)}>
                <Iframe />
            </div>
        </>
    )
}
