import { tokenList } from "../../utils/lists"

const WalletTabs = () => {
    return (
        <div className="flex w-full h-full items-start justify-center flex-col px-1">
            <div className="flex flex-row items-start justify-center space-x-2">
                <button className="h-10 w-24 bg-slate-300 rounded-t-xl" type="button">
                    Tokens
                </button>
                <button className="h-10 w-24 bg-slate-300 rounded-t-xl disabled:opacity-80" type="button" disabled>
                    Games
                </button>
            </div>
            <div className="flex flex-col w-full h-4/5 p-2 bg-slate-300 rounded-b-xl rounded-tr-xl">
                {tokenList.map((token) => (
                    <div key={token.name} className="flex flex-row items-center justify-between px-2 h-12">
                        <span>{`${token.name} (${token.symbol})`}</span>
                        <span>{`${token.balance}`}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default WalletTabs
