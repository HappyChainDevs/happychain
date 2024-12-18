// DecodedData.tsx
import { CaretDown } from "@phosphor-icons/react"
import type { PropsWithChildren } from "react"
import { isAddress, isHex } from "viem"
import {
    recipeDisclosureContent,
    recipeDisclosureDetails,
    recipeDisclosureSummary,
} from "#src/components/primitives/disclosure/variants"

interface DecodedDataProps {
    data: {
        functionName: string
        args: readonly unknown[] | undefined
    }
}

/**
 * Determines a human-readable `displayValue` and `displayType` based on the argument's type and content.
 *
 * Behavior:
 * - For `string`:
 *   - If the string is recognized as an Ethereum address (`isAddress`), `displayType` is set to `"address"`.
 *   - If the string is recognized as hex data (`isHex`), `displayType` is set to `"hex"`.
 *   - Otherwise, it remains `"string"`.
 *
 * - For `bigint`:
 *   - The `displayValue` is converted to a string.
 *   - `displayType` remains `"bigint"`.
 *
 * - For other types (`number`, `boolean`, `symbol`, `undefined`, `object`, `function`):
 *   - No special handling is applied.
 *   - `displayValue` is just `String(arg)`, and `displayType` is `typeof arg`.
 *
 * Examples:
 * - `arg = "0x123...abc"` (valid hex, not necessarily address) -> displayValue: "0x123...abc", displayType: "hex"
 * - `arg = "0x1234567890abcdef1234567890abcdef12345678"` (valid 20-byte address) -> displayValue: same string, displayType: "address"
 * - `arg = 42` -> displayValue: "42", displayType: "number"
 * - `arg = 1000n` (bigint) -> displayValue: "1000", displayType: "bigint"
 * - `arg = "hello"` (simple string) -> displayValue: "hello", displayType: "string"
 */

function getTypeDisplayInfo(arg: unknown): { displayValue: string; displayType: string } {
    const rawType = typeof arg
    let displayValue = String(arg)
    let displayType: string = rawType

    if (rawType === "string") {
        const str = arg as string
        if (isAddress(str)) {
            displayType = "address"
        } else if (isHex(str)) {
            displayType = "hex"
        }
    } else if (rawType === "bigint") {
        displayValue = (arg as bigint).toString()
    }

    return { displayValue, displayType }
}

const DecodedData = ({ data }: PropsWithChildren<DecodedDataProps>) => {
    const { functionName, args } = data

    return (
        <details className={recipeDisclosureDetails({ intent: "neutral" })}>
            <summary className={recipeDisclosureSummary()}>
                Decoded Function Data:
                <CaretDown size="1.25em" />
            </summary>
            <div className={recipeDisclosureContent({ intent: "neutral" })}>
                <div className="flex flex-col size-full items-start justify-center">
                    <div className="flex w-full justify-between items-baseline gap-[1ex]">
                        <span className="text-sm opacity-75">Function Name:</span>
                        <span className="font-mono text-sm truncate px-2 py-1 bg-primary rounded-md">
                            {functionName}
                        </span>
                    </div>

                    {args && args.length > 0 && (
                        <div className="flex flex-col gap-2 w-full mt-2">
                            {args.map((arg, idx) => {
                                const { displayValue, displayType } = getTypeDisplayInfo(arg)
                                return (
                                    <div
                                        key={`${idx}-${displayValue}`}
                                        className="flex justify-between items-baseline gap-[1ex]"
                                    >
                                        <span className="font-mono text-sm opacity-75">args[{idx}]:</span>
                                        <span className="font-mono text-sm truncate hover:whitespace-normal hover:overflow-visible hover:text-overflow-clip hover:bg-neutral-100 hover:break rounded-lg p-1">
                                            {displayValue} <span className="opacity-50">({displayType})</span>
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </details>
    )
}

export default DecodedData
