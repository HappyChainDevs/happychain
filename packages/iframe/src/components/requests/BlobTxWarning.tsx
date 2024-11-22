import { Button } from "../primitives/button/Button"

/**
 * Component for user to reject the request if it's an EIP4844 tx.
 */
interface BlobTxWarningProps {
    onReject: () => void
}

export const BlobTxWarning = ({ onReject }: BlobTxWarningProps) => {
    return (
        <div className="flex w-full flex-col gap-2">
            <p className="text-error font-mono">EIP-4844 blob transactions are not supported</p>
            <Button intent={"outline-negative"} onClick={onReject}>
                Reject
            </Button>
        </div>
    )
}
