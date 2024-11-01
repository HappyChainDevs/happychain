import { tokenList } from "#src/utils/lists.ts"

/**
 * Displays user's $HAPPY balance.
 */
const TokenView = () => {
    return (
        <div className="flex flex-col w-full max-h-4/5 overflow-y-auto p-2 rounded-b-xl rounded-tr-xl">
            {tokenList && tokenList.length > 0 ? (
                tokenList.map((token) => (
                    <div key={token.name} className="flex flex-row items-center justify-between px-2 h-12">
                        <span>{`${token.name} (${token.symbol})`}</span>
                        <span>{`${token.balance}`}</span>
                    </div>
                ))
            ) : (
                <div>No tokens found.</div>
            )}
        </div>
    )
}

export default TokenView
