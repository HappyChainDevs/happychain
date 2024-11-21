import { CaretDown } from "@phosphor-icons/react"
import { type PropsWithChildren, useMemo } from "react"
import {
    recipeDisclosureContent,
    recipeDisclosureDetails,
    recipeDisclosureSummary,
} from "#src/components/primitives/disclosure/variants.js"

const RequestDetails = ({ children }: PropsWithChildren) => {
    const memoizedChildren = useMemo(() => children, [children])

    return (
        <details className={recipeDisclosureDetails({ intent: "gradient" })}>
            <summary className={recipeDisclosureSummary()}>
                View Request Details:
                <CaretDown size="1.25em" />
            </summary>
            <div className={recipeDisclosureContent({ intent: "gradient" })}>{memoizedChildren}</div>
        </details>
    )
}

export default RequestDetails
