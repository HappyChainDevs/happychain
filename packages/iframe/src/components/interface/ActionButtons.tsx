const ActionButtons = () => {
    return (
        <div className="flex flex-row w-full items-center justify-center space-x-6 px-2 py-4 border-[1px] border-slate-600 border-opacity-50 rounded-lg">
            <button type="button" className="h-10 w-24 bg-cyan-600 text-black rounded-xl">
                Send
            </button>
            <button type="button" className="h-10 w-24 bg-cyan-600 text-black rounded-xl disabled:opacity-80" disabled>
                Buy / Sell
            </button>
            <button type="button" className="h-10 w-24 bg-cyan-600 text-black rounded-xl disabled:opacity-80" disabled>
                Top Up
            </button>
        </div>
    )
}

export default ActionButtons
