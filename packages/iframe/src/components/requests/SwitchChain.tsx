import type { HappyUser } from '@happychain/sdk-shared'
import { useAtomValue } from 'jotai'

import { requestLabels } from '../../constants/requestLabels'
import { chainsAtom } from '../../state/chains'

interface SendTransactionProps {
    method: string
    params: [{ chainId: `0x${string}` }]
    reject: () => void
    accept: ({ method, params }: { method: string; params: unknown[] }) => void
}

const safeGet = (key: string) => {
    try {
        return JSON.parse(localStorage.getItem(key) || 'null')
    } catch {
        return null
    }
}

const user = safeGet('happychain:cached-user') as HappyUser

export function SwitchChain({ method, params, reject, accept }: SendTransactionProps) {
    const chains = useAtomValue(chainsAtom)

    const chain = chains.find((chain) => chain.chainId === params[0].chainId)
    if (!chain) {
        return (
            <main className="flex h-dvh flex-col items-start justify-between gap-4 bg-base-300 p-4">
                <div className="flex w-full grow flex-col gap-4">
                    <div className="w-full rounded-lg bg-base-200 p-4 font-bold">{window.location.origin}</div>
                    <div className="w-full rounded-lg bg-base-200 p-4 font-bold">
                        {requestLabels[method] ?? 'Unknown Signature Type'}
                    </div>

                    <div className="flex grow flex-col gap-4 overflow-x-auto bg-zinc-100 p-4">
                        <div className="border-b border-zinc-300 pb-2 text-center text-sm font-bold text-blue-600">
                            Switch Chain
                        </div>
                        <pre>{JSON.stringify({ method, params }, null, 2)}</pre>
                    </div>
                    <div className="font-bold">Failed to find details for chain {params[0].chainId}</div>

                    <button
                        type="button"
                        className="btn border-2 border-red-300 bg-red-100 hover:border-red-100 hover:bg-red-100"
                        onClick={reject}
                    >
                        Cancel
                    </button>
                </div>
            </main>
        )
    }
    return (
        <main className="flex h-dvh flex-col items-start justify-between gap-4 bg-base-300 p-4">
            <div className="flex w-full grow flex-col gap-4">
                <div className="w-full rounded-lg bg-base-200 p-4 font-bold">{window.location.origin}</div>
                <div className="w-full rounded-lg bg-base-200 p-4 font-bold">
                    {requestLabels[method] ?? 'Unknown Signature Type'}
                </div>

                <div className="flex grow flex-col gap-4 overflow-x-auto bg-zinc-100 p-4">
                    <div className="border-b border-zinc-300 pb-2 text-center text-sm font-bold text-blue-600">
                        Switch Chain
                    </div>

                    <div>New Chain: {chain.chainName}</div>
                    <div>Chain ID: {chain.chainId}</div>
                </div>
            </div>

            <div>
                {user.email}
                <br />
                {user.address.slice(0, 8)} ... {user.address.slice(-8)}
            </div>

            <div className="flex w-full gap-4">
                <button
                    type="button"
                    className="btn grow border-2 border-green-300 bg-green-300 hover:bg-green-400"
                    onClick={() => accept({ method, params })}
                >
                    Switch
                </button>
                <button
                    type="button"
                    className="btn border-2 border-red-300 bg-red-100 hover:border-red-100 hover:bg-red-100"
                    onClick={reject}
                >
                    Cancel
                </button>
            </div>
        </main>
    )
}
