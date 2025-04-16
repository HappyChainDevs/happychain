import { CaretDown, WarningCircle } from "@phosphor-icons/react"
import { cx } from "class-variance-authority"
import type { AbiFunction } from "viem"
import {
    recipeDisclosureContent,
    recipeDisclosureDetails,
    recipeDisclosureSummary,
} from "#src/components/primitives/disclosure/variants"
import ArgsList from "./ArgsList"
import { SectionBlock, SubsectionTitle } from "./Layout"

interface DecodedDataProps {
    data: {
        args: readonly unknown[] | undefined
        abiFuncDef: AbiFunction
    }
}

const DecodedData = ({ data }: DecodedDataProps) => {
    const { args = [], abiFuncDef } = data

    return (
        <SectionBlock>
            <details className={recipeDisclosureDetails({ intent: "neutral" })}>
                <summary className={recipeDisclosureSummary()}>
                    <SubsectionTitle>{"Decoded Function Data"}</SubsectionTitle>
                    <CaretDown size="1.25em" />
                </summary>
                <div className="flex items-center gap-2 p-2 border-t border-b border-neutral/10">
                    <WarningCircle size="1.25em" />
                    <SubsectionTitle>This ABI is not verified.</SubsectionTitle>
                </div>

                <div
                    className={cx(
                        "flex flex-col gap-4 w-full overflow-x-auto",
                        recipeDisclosureContent({ intent: "neutral" }),
                    )}
                >
                    <div className="flex flex-wrap justify-between items-baseline gap-2 p-2 border-b border-neutral/10">
                        <span className="opacity-75 text-xs">Function Name:</span>
                        <span className="font-mono text-xs truncate px-2 py-1 bg-primary text-primary-content rounded-md max-w-[50%] hover:break-words">
                            {abiFuncDef.name}
                        </span>
                    </div>

                    {args.length > 0 && (
                        <div className="w-full">
                            <ArgsList args={args} fnInputs={abiFuncDef.inputs} />
                        </div>
                    )}
                </div>
            </details>
        </SectionBlock>
    )
}

export default DecodedData
