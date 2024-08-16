import { useState } from 'react'

import { createLazyFileRoute } from '@tanstack/react-router'

import { DotLinearWaveLoader } from '../components/loaders/DotLinearWaveLoader'
import { PersonalSign } from '../components/requests/PersonalSign'
import { SendTransaction } from '../components/requests/SendTransaction'
import { popupBus } from '../services/eventBus'

export const Route = createLazyFileRoute('/request')({
    component: Request,
})

function Request() {
    const [isLoading, setIsLoading] = useState(false)
    const { args, key } = Route.useSearch()
    const req = JSON.parse(atob(args))

    function reject() {
        popupBus.emit('request:reject', {
            error: {
                code: 4001,
                message: 'User rejected request',
                data: 'User rejected request',
            },
            key,
            payload: null,
        })
    }

    function accept() {
        setIsLoading(true)
        popupBus.emit('request:approve', {
            error: null,
            key,
            payload: req,
        })
    }

    if (isLoading) {
        return <DotLinearWaveLoader />
    }

    if (req.method === 'personal_sign') {
        return <PersonalSign method={req.method} params={req.params} reject={reject} accept={accept} />
    }

    if (req.method === 'eth_sendTransaction') {
        return <SendTransaction method={req.method} params={req.params} reject={reject} accept={accept} />
    }

    return (
        <main>
            UNKNOWN REQUEST:
            <pre>{JSON.stringify(req)}</pre>
        </main>
    )
}
