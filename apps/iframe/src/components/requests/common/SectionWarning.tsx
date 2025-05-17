import { cx } from "class-variance-authority"
import type { PropsWithChildren } from "react"
import { SectionBlock } from "#src/components/requests/common/Layout"

export function SectionWarning({ children, className }: PropsWithChildren<{ className?: string }>) {
    return (
        <SectionBlock>
            <div
                className={cx(
                    "grid border bg-warning/40 border-warning dark:bg-warning/5 dark:border-warning/20",
                    "text-warning-content/90 dark:text-warning gap-2 text-sm py-[1em] px-[1.25em] rounded-lg w-full",
                    className,
                )}
            >
                {children}
            </div>
        </SectionBlock>
    )
}
