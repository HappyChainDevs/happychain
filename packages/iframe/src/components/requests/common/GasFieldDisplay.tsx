import FieldLoader from "#src/components/loaders/FieldLoader"

export enum GasFieldName {
    MaxFeePerGas = "MaxFeePerGas",
    MaxPriorityFeePerGas = "MaxPriorityFeePerGas",
}

interface GasFieldDisplayProps {
    name: GasFieldName
    field?: string
}

const GasFieldDisplay = ({ field }: GasFieldDisplayProps) => {
    return (
        <div className="flex items-center justify-between">
            <span className="text-sm text-content font-mono">MaxFeePerGas:</span>
            {field ? <span className="font-mono text-sm uppercase truncate">{`${field} gwei`}</span> : <FieldLoader />}
        </div>
    )
}

export default GasFieldDisplay
