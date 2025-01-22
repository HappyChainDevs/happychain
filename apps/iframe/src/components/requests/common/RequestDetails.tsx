import { CaretDown } from "@phosphor-icons/react"
import type { PropsWithChildren } from "react"
import {
    recipeDisclosureContent,
    recipeDisclosureDetails,
    recipeDisclosureSummary,
} from "#src/components/primitives/disclosure/variants"

const RequestDetails = ({ children }: PropsWithChildren) => {
    return (
        <details className={recipeDisclosureDetails({ intent: "gradient" })}>
            <summary className={recipeDisclosureSummary()}>
                View Request Details:
                <CaretDown size="1.25em" />
            </summary>
            <div className={recipeDisclosureContent({ intent: "gradient" })}>{children}</div>
        </details>
    )
}

export default RequestDetails
