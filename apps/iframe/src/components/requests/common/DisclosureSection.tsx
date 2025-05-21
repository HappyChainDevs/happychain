import { CaretDownIcon, WarningCircleIcon } from "@phosphor-icons/react"
import { cx } from "class-variance-authority"
import type { PropsWithChildren } from "react"
import {
    recipeDisclosureContent,
    recipeDisclosureDetails,
    recipeDisclosureSummary,
} from "#src/components/primitives/disclosure/variants"
import { SectionBlock, SubsectionTitle } from "./Layout"

interface DisclosureSectionProps extends PropsWithChildren {
    title: string
    showWarning?: boolean
    warningText?: string
    isOpen?: boolean
}

/**
 * This component displays a collapsible section with a title, optional warning
 * message, and customizable content - for pertinent extra details in request popups.
 * It wraps content in a styled <details> block with toggle support.
 */
const DisclosureSection = ({
    title,
    showWarning = false,
    warningText,
    isOpen = false,
    children,
}: DisclosureSectionProps) => {
    return (
        <SectionBlock>
            <details className={recipeDisclosureDetails({ intent: "neutral" })} open={isOpen}>
                <summary className={recipeDisclosureSummary()}>
                    <SubsectionTitle>{title}</SubsectionTitle>
                    <CaretDownIcon size="1.25em" />
                </summary>

                {showWarning && (
                    <div className="flex items-center gap-2 p-2 border-t border-b border-neutral/10">
                        <WarningCircleIcon size="1.25em" />
                        <SubsectionTitle>{warningText}</SubsectionTitle>
                    </div>
                )}

                <div
                    className={cx(
                        "flex flex-col gap-4 w-full overflow-x-auto",
                        recipeDisclosureContent({ intent: "neutral" }),
                    )}
                >
                    {children}
                </div>
            </details>
        </SectionBlock>
    )
}

export default DisclosureSection
