import { Button } from "../primitives/button/Button"

/**
 * Component for user to reject the request if it's an EIP4844 tx.
 */
interface BlobTxWarningProps {
    onReject: () => void
}

export const BlobTxWarning = ({ onReject }: BlobTxWarningProps) => {
    return (
        <div className="grid gap-2 justify-center">
            <p className="text-error">EIP-4844 blob transactions are not supported.</p>
            <Button intent="ghost" className="justify-center" onClick={onReject}>
                I understand, go back
            </Button>
        </div>
    )
}
