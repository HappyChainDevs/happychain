import { memo, useEffect, useMemo, useState } from 'react'

import type { HappyUser } from '@happychain/core'
import { config, onModalUpdate } from '@happychain/core'
import { clsx } from 'clsx'

import { useHappyChain } from '../hooks/useHappyChain'

const Iframe = memo(() => (
    <iframe
        title="happy-iframe"
        data-testid="happy-iframe"
        src={`${config.iframePath}/connect`}
        style={{ width: '100%', height: '100%' }}
    />
))

function generateContainerClasses(user: HappyUser | null, isOpen: boolean) {
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

    useEffect(() => onModalUpdate((state) => setIsOpen(state)), [])

    const iframeContainerClasses = useMemo(() => generateContainerClasses(user, isOpen), [user, isOpen])

    return (
        <>
            <div className={clsx('hc-fixed hc-top-0 hc-right-0', iframeContainerClasses)}>
                <Iframe />
            </div>
        </>
    )
}
