import { type Abi, formatAbiItem } from "abitype"

interface AbiSectionProps {
    label: string
    abiSection: Abi
}

const AbiSection = ({ label, abiSection }: AbiSectionProps) => {
    return (
        <div className="flex flex-col items-center justify-start">
            <h2 className="text-lg font-bold text-primary font-mono">{label}</h2>
            <div className="flex flex-col space-y-2 mt-2">
                {abiSection.map((event) => (
                    <div key={`event-${event}`} className="p-2 bg-neutral-content text-neutral rounded">
                        {formatAbiItem(event)}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default AbiSection
