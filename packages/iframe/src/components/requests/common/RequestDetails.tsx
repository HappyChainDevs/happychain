import { CaretDown } from "@phosphor-icons/react"
import { type PropsWithChildren, useMemo } from "react"
import {
    disclosureContentRecipe,
    disclosureDetailsRecipe,
    disclosureSummaryRecipe,
} from "#src/components/primitives/disclosure/variants.js"

const RequestDetails = ({ children }: PropsWithChildren) => {
    const memoizedChildren = useMemo(() => children, [children])

    return (
        <details className={disclosureDetailsRecipe({ intent: "gradient" })}>
            <summary className={disclosureSummaryRecipe({ intent: "gradient" })}>
                View Request Details:
                <CaretDown size="1.25em" />
            </summary>
            <div className={disclosureContentRecipe({ intent: "gradient" })}>{memoizedChildren}</div>
        </details>
    )
}

export default RequestDetails
