import { type Abi, formatAbiItem } from "abitype"

interface AbiSectionProps {
    label: string
    abiSection: Abi
}

const AbiSection = ({ label, abiSection }: AbiSectionProps) => {
    return (
        <section className="grid gap-1 relative">
            <h2 className="text-xs opacity-70 dark:opacity-50">{label}</h2>
            <ol className="divide-y divide-neutral/40 -mx-2.5">
                {abiSection.map((event) => (
                    <li className="p-2.5" key={`abi-item-${event.type}`}>
                        <pre>{formatAbiItem(event)}</pre>
                    </li>
                ))}
            </ol>
        </section>
    )
}

export default AbiSection
