/** @jsxImportSource preact */
const short = ([address]: string[]) => `${address.slice(0, 6)}...${address.slice(-4)}`

export function ConnectionStatus({
    initialized,
    connecting,
    accounts,
}: { initialized: boolean; connecting: boolean; accounts: `0x${string}`[] }) {
    if (!initialized) return <>Loading</>
    if (connecting) return <>Connecting</>
    if (accounts.length) return <>{short(accounts)}</>
    return <>Connect</>
}
