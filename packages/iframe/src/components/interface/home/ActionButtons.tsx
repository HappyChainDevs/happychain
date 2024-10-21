import { Link } from "@tanstack/react-router"

const ActionButtons = () => {
    return (
        <div className="flex flex-row w-full items-center justify-center space-x-6 px-2 py-2 border border-slate-600 border-opacity-50 rounded-lg">
            <Link
                type="button"
                className="flex items-center justify-center h-10 w-24 bg-cyan-600 text-black rounded-xl text-center"
                to="/embed/send"
            >
                Send
            </Link>
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
