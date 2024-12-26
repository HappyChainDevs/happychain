import type { TypeDisplayInfo } from "#src/utils/getTypeDisplayInfo"

interface ArgsListProps {
    args: TypeDisplayInfo[]
}

const ArgsList = ({ args }: ArgsListProps) => {
    return (
        <div className="flex flex-col gap-2 w-full mt-2">
            {args.map((arg, idx) => {
                return (
                    <div key={`arg-${arg.displayValue}`} className="flex justify-between items-baseline gap-[1ex]">
                        <span className="font-mono text-sm opacity-75">args[{idx}]:</span>
                        <span className="font-mono text-sm truncate break-words hover:whitespace-normal hover:overflow-visible hover:text-overflow-clip hover:bg-neutral-100 hover:break rounded-lg p-1">
                            {arg.displayValue} <span className="opacity-50">({arg.displayType})</span>
                        </span>
                    </div>
                )
            })}
        </div>
    )
}

export default ArgsList
