export function BlobTxWarning({ onReject }: { onReject: () => void }) {
    return (
        <div className="flex w-full flex-col gap-2">
            <div className="text-red-500 font-mono">EIP-4844 blob transactions are not supported</div>
            <button
                type="button"
                className="btn border-2 border-red-300 bg-red-100 hover:border-red-100 hover:bg-red-100"
                onClick={onReject}
            >
                Reject
            </button>
        </div>
    )
}
