import { CaretDown } from "@phosphor-icons/react"
import {
    recipeDisclosureContent,
    recipeDisclosureDetails,
    recipeDisclosureSummary,
} from "#src/components/primitives/disclosure/variants.js"
import type { requestLabels } from "#src/constants/requestLabels.js"
import type { RequestConfirmationProps } from "../props"

interface RawTxDetailsProps {
    params: RequestConfirmationProps<keyof typeof requestLabels>["params"]
}

const RawRequestDetails = ({ params }: RawTxDetailsProps) => {
    return (
        <details className={recipeDisclosureDetails({ intent: "default" })}>
            <summary className={recipeDisclosureSummary()}>
                Raw Request Payload:
                <CaretDown size="1.25em" />
            </summary>
            <pre className={recipeDisclosureContent({ intent: "default" })}>{JSON.stringify(params, null, 2)}</pre>
        </details>
    )
}

export default RawRequestDetails
