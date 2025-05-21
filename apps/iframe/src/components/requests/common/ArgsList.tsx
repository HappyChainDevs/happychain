import type { AbiParameter } from "abitype"

interface ArgsListProps {
    args: readonly unknown[] | undefined
    fnInputs: readonly AbiParameter[]
}

const ArgsList = ({ args = [], fnInputs }: ArgsListProps) => {
    return (
        <ul className="flex flex-col gap-2 w-full mt-2 px-2 py-1">
            {args.map((arg, idx) => {
                const name = fnInputs[idx]?.name ?? `arg[${idx}]`
                const type = fnInputs[idx]?.type ?? "unknown type"
                const value = String(arg)

                return (
                    <li
                        // biome-ignore lint/suspicious/noArrayIndexKey: arg types are too varied
                        key={`idx-${idx}`}
                        className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2 items-start"
                    >
                        <span className="font-mono text-xs opacity-60 overflow-hidden text-ellipsis whitespace-nowrap hover:whitespace-normal hover:break-words hover:overflow-visible">
                            {name}
                        </span>

                        <span className="flex flex-col gap-0.5">
                            <span className="font-mono bg-neutral/10 dark:bg-neutral px-2 py-1 rounded-md text-xs overflow-hidden text-ellipsis hover:break-words max-w-full">
                                {value}
                            </span>
                            <span className="text-[10px] font-medium opacity-50">{type}</span>
                        </span>
                    </li>
                )
            })}
        </ul>
    )
}

export default ArgsList
