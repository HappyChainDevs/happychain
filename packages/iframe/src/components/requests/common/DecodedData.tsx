import { CaretDown, WarningCircle } from "@phosphor-icons/react"
import { cx } from "class-variance-authority"
import { useMemo } from "react"
import {
    recipeDisclosureContent,
    recipeDisclosureDetails,
    recipeDisclosureSummary,
} from "#src/components/primitives/disclosure/variants"
import { getTypeDisplayInfo } from "#src/utils/getTypeDisplayInfo"
import ArgsList from "./ArgsList"

interface DecodedDataProps {
    data: {
        functionName: string
        args: readonly unknown[] | undefined
    }
}

const DecodedData = ({ data }: DecodedDataProps) => {
    const { functionName, args = [] } = data

    const decodedArgs = useMemo(() => {
        return args.map((arg) => getTypeDisplayInfo(arg))
    }, [args])

    return (
        <details className={recipeDisclosureDetails({ intent: "neutral" })}>
            <summary className={recipeDisclosureSummary()}>
                Decoded Function Data:
                <CaretDown size="1.25em" />
            </summary>
            <div
                className={cx(
                    ["flex flex-col gap-y-2 size-full items-start justify-center"],
                    recipeDisclosureContent({ intent: "neutral" }),
                )}
            >
                <div className="flex w-full justify-start items-center gap-[1ex]">
                    <WarningCircle size={"1.25em"} />
                    <span className="italic text-neutral">This ABI is not verified.</span>
                </div>
                <div className="flex w-full justify-between items-baseline gap-[1ex]">
                    <span className="text-sm opacity-75">Function Name:</span>
                    <span className="font-mono text-sm truncate px-2 py-1 bg-primary rounded-md">{functionName}</span>
                </div>

                {decodedArgs.length > 0 && <ArgsList args={decodedArgs} />}
            </div>
        </details>
    )
}

export default DecodedData
