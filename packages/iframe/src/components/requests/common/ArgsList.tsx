import type { AbiParameter } from "viem"

interface ArgsListProps {
    args: readonly unknown[]
    fnInputs: readonly AbiParameter[]
}

function formatDisplayValue(arg: unknown) {
    const rawType = typeof arg
    return rawType === "bigint" ? (arg as bigint).toString() : String(arg)
}

const ArgsList = ({ args, fnInputs }: ArgsListProps) => {
    return (
        <ul className="flex flex-col gap-2 w-full mt-2">
            {args.map((arg, idx) => {
                return (
                    <li
                        key={`idx-${
                            // biome-ignore lint/suspicious/noArrayIndexKey: arg types are too varied
                            idx
                        }`}
                        className="flex justify-between items-baseline gap-[1ex]"
                    >
                        <span className="font-mono text-sm opacity-75">{fnInputs[idx].name}</span>
                        <span className="font-mono text-sm max-w-[60%] truncate group-hover:text-wrap hover:break-all hover:whitespace-normal hover:bg-neutral-100 rounded-lg p-1">
                            {formatDisplayValue(arg)} <span className="opacity-50">{fnInputs[idx].type}</span>
                        </span>
                    </li>
                )
            })}
        </ul>
    )
}

export default ArgsList
