import { CaretDown } from "@phosphor-icons/react"
import {
    disclosureContentRecipe,
    disclosureDetailsRecipe,
    disclosureSummaryRecipe,
} from "#src/components/primitives/disclosure/variants.js"
import type { requestLabels } from "#src/constants/requestLabels.js"
import type { RequestConfirmationProps } from "../props"

interface RawTxDetailsProps {
    params: RequestConfirmationProps<keyof typeof requestLabels>["params"]
}

const RawRequestDetails = ({ params }: RawTxDetailsProps) => {
    return (
        <details className={disclosureDetailsRecipe({ intent: "raw" })}>
            <summary className={disclosureSummaryRecipe({ intent: "raw" })}>
                Raw Request Payload:
                <CaretDown size="1.25em" />
            </summary>
            <pre className={disclosureContentRecipe({ intent: "raw" })}>{JSON.stringify(params, null, 2)}</pre>
        </details>
    )
}

export default RawRequestDetails
