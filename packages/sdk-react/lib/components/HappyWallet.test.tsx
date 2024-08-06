import type { PropsWithChildren } from 'react'

import { render, screen } from '@testing-library/react'
import clsx from 'clsx'
import { useHydrateAtoms } from 'jotai/utils'
import { describe, expect, it } from 'vitest'

import { userAtom } from '../state/happyUser'

import { HappyWallet } from './HappyWallet'

const JotaiHydrateAtoms = ({
    initialValues,
    children,
}: PropsWithChildren<{
    initialValues: unknown[][]
}>) => {
    useHydrateAtoms(initialValues as unknown as Parameters<typeof useHydrateAtoms>[0])
    return children
}

const BASE_CLASS_NAMES = 'hc-fixed hc-top-0 hc-right-0'

describe('loads and displays wallet', () => {
    it('inserts iframe in document', async () => {
        render(<HappyWallet />)

        expect(screen.getByTitle('happy-iframe')).toBeInTheDocument()
    })

    it('loads with initial classes', async () => {
        render(<HappyWallet />)

        await screen.findByTestId('happy-iframe')

        expect(screen.getByTitle('happy-iframe')?.parentNode).toHaveClass(
            clsx(BASE_CLASS_NAMES, 'hc-w-28', 'hc-h-20', 'hc-rounded-lg', 'hc-overflow-hidden'),
        )
    })

    it('opens modal via message bus', async () => {
        const initialValues = [
            [
                userAtom,
                {
                    uid: '1',
                    email: 'happy@example.com',
                    name: 'Happy User',
                    avatar: 'http://example.com',
                    provider: 'testing',
                    type: 'injected',
                    ens: '',
                    address: '0x1234',
                    addresses: ['0x12234'],
                },
            ],
        ]

        render(
            <JotaiHydrateAtoms initialValues={initialValues}>
                <HappyWallet />
            </JotaiHydrateAtoms>,
        )

        expect(screen.getByTitle('happy-iframe')?.parentNode).toHaveClass(
            clsx(
                BASE_CLASS_NAMES,
                'hc-w-52', // wider
                'hc-h-20',
                'hc-rounded-lg',
                'hc-overflow-hidden',
            ),
        )
    })
})
