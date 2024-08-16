import type { HappyUser } from '@happychain/sdk-shared'

interface SendTransactionProps {
    method: string
    params: [`0x${string}`, `0x${string}`]
    reject: () => void
    accept: () => void
}

const signatureTypes: Record<string, string> = {
    personal_sign: 'Signature Request',
    eth_sendTransaction: 'Send Transaction',
}

const safeGet = (key: string) => {
    try {
        return JSON.parse(localStorage.getItem(key) || 'null')
    } catch {
        return null
    }
}

const user = safeGet('happychain:cached-user') as HappyUser

export function SendTransaction({ method, params, reject, accept }: SendTransactionProps) {
    return (
        <main className="flex h-dvh flex-col items-start justify-between gap-4 bg-base-300 p-4">
            <div className="flex w-full grow flex-col gap-4">
                <div className="w-full rounded-lg bg-base-200 p-4 font-bold">{window.location.origin}</div>
                <div className="w-full rounded-lg bg-base-200 p-4 font-bold">
                    {signatureTypes[method] ?? 'Unknown Signature Type'}
                </div>

                <div className="flex grow flex-col gap-4 overflow-x-auto bg-zinc-100 p-4">
                    <div className="border-b border-zinc-300 pb-2 text-center text-sm font-bold text-blue-600">
                        Raw Transaction
                    </div>
                    <pre className="grow">{JSON.stringify(params, null, 2)}</pre>
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
                    onClick={accept}
                >
                    Sign
                </button>
                <button
                    type="button"
                    className="btn border-2 border-red-300 bg-red-100 hover:border-red-100 hover:bg-red-100"
                    onClick={reject}
                >
                    Reject
                </button>
            </div>
        </main>
    )
}
