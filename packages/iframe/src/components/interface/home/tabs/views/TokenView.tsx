import { tokenList } from "#src/utils/lists.ts"

/**
 * Displays user's $HAPPY balance.
 */
const TokenView = () => {
    return (
        <div className="flex flex-col rounded-es-xl rounded-e-xl size-full">
            {tokenList && tokenList.length > 0 ? (
                tokenList.map((token) => (
                    <div key={token.name} className="flex flex-row items-center justify-between h-12">
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
