import { requestLabels } from "#src/constants/requestLabels.js"

interface RequestDisplayHeaderProps {
    method: keyof typeof requestLabels
}

const RequestDisplayHeader = ({ method }: RequestDisplayHeaderProps) => {
    return (
        <>
            <div className="w-full rounded-lg bg-base-200 p-4 font-bold">{window.location.origin}</div>
            <div className="w-full rounded-lg bg-base-200 p-4 font-bold">
                {requestLabels[method] ?? "Unknown Signature Type"}
            </div>
        </>
    )
}

export default RequestDisplayHeader
