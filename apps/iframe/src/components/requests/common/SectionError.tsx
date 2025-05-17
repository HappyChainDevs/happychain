import { cx } from "class-variance-authority"
import type { PropsWithChildren } from "react"
import { SectionBlock } from "#src/components/requests/common/Layout"

export function SectionError({ children, className }: PropsWithChildren<{ className?: string }>) {
    return (
        <SectionBlock>
            <div
                className={cx(
                    "grid border bg-error/40 border-error dark:bg-error/5 dark:border-error/20",
                    "text-error-content/90 dark:text-error gap-2 text-sm py-[1em] px-[1.25em] rounded-lg w-full",
                    className,
                )}
            >
                {children}
            </div>
        </SectionBlock>
    )
}
