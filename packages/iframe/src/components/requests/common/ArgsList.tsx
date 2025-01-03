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
        <div className="flex flex-col gap-2 w-full mt-2">
            {args.map((arg, idx) => {
                return (
                    <div key={"calldef"} className="flex justify-between items-baseline gap-[1ex]">
                        <span className="font-mono text-sm opacity-75">{fnInputs[idx].name}</span>
                        <span className="font-mono text-sm truncate break-words hover:whitespace-normal hover:overflow-visible hover:text-overflow-clip hover:bg-neutral-100 hover:break rounded-lg p-1">
                            {formatDisplayValue(arg)} <span className="opacity-50">{fnInputs[idx].type}</span>
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

export default ArgsList
