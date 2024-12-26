import { type Abi, formatAbiItem } from "abitype"

interface AbiSectionProps {
    label: string
    abiSection: Abi
}

const AbiSection = ({ label, abiSection }: AbiSectionProps) => {
    return (
        <section className="flex flex-col items-center justify-start">
            <h3 className="text-lg font-bold text-primary font-mono">{label}</h3>
            <ul className="flex flex-col space-y-2 mt-2">
                {abiSection.map((event) => (
                    <li key={`abi-item-${event.type}`} className="p-2 bg-neutral-content text-neutral rounded">
                        {formatAbiItem(event)}
                    </li>
                ))}
            </ul>
        </section>
    )
}

export default AbiSection
