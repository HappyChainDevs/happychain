/** Placeholder component to show loading status of transaction
 *  being confirmed in a block. */
const LoadingSkeleton = () => {
    return (
        <div className="border border-blue-300 shadow rounded-md p-4 w-full">
            <div className="animate-pulse flex space-x-4">
                <div className="rounded-full bg-slate-700 h-6 w-10" />
                <div className="flex-1 space-y-6 py-1">
                    <div className="h-2 bg-slate-700 rounded" />
                </div>
            </div>
        </div>
    )
}

export default LoadingSkeleton
