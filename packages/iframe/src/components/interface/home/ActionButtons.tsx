import { Link } from "@tanstack/react-router"

const ActionButtons = () => {
    return (
        <div className="flex flex-row w-full items-center justify-center gap-2 p-2 border border-neutral/50 rounded-lg">
            <Link
                type="button"
                className="flex items-center justify-center h-10 w-24 bg-primary text-primary-content rounded-xl text-center"
                to="/embed/send"
            >
                Send
            </Link>
            <button
                type="button"
                className="h-10 w-24 bg-primary text-primary-content rounded-xl disabled:opacity-80"
                disabled
            >
                Buy / Sell
            </button>
            <button
                type="button"
                className="h-10 w-24 bg-primary text-primary-content rounded-xl disabled:opacity-80"
                disabled
            >
                Top Up
            </button>
        </div>
    )
}

export default ActionButtons
