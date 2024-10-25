import { Collapsible, type UseCollapsibleReturn } from "@ark-ui/react"
import { cx } from "class-variance-authority"
import type { PropsWithChildren } from "react"
import { type ButtonVariantsProps, recipeButton } from "../button/variants"

interface InlineDrawerProps extends PropsWithChildren {
    rootContext: UseCollapsibleReturn
    trigger: {
        intent: ButtonVariantsProps["intent"]
        label: React.ReactNode
    }
}

/**
 * A collapsible acting like an inline bottom drawer.
 * @see https://ark-ui.com/react/docs/components/collapsible#using-the-root-provider
 */
const InlineDrawer = ({ rootContext, trigger, children }: InlineDrawerProps) => {
    return (
        <Collapsible.RootProvider
            className={cx([
                // Pseudo backdrop styles
                "before:fixed before:inset-0 before:size-full before:content-[' ']",
                "before:bg-opacity-0 before:bg-neutral",
                "data-[state=closed]:before:z-[-1]",
                "data-[state=open]:before:bg-opacity-50 data-[state=open]:before:z-auto",
                "motion-safe:data-[state=open]:before:animate-fadeIn motion-safe:data-[state=closed]:before:animate-fadeOut",
            ])}
            value={rootContext}
        >
            <div
                data-part="wrapper"
                className={`${rootContext.visible ? "rounded-t-[2rem] pt-6" : "rounded-t-none"} rounded-b-xl [animation-delay:250ms] [animation-fill-mode:both] animate-growIn bg-base-100 fixed flex flex-col bottom-px start-px min-h-12 w-[calc(100%-2px)] border-t border-neutral/10`}
            >
                <Collapsible.Trigger
                    className={cx(
                        "text-xs grow w-full justify-center",
                        rootContext.visible
                            ? "font-bold focus:outline-none text-base-content"
                            : recipeButton({
                                  intent: trigger.intent,
                                  class: "focus:!bg-transparent",
                              }),
                    )}
                >
                    {trigger.label}
                </Collapsible.Trigger>

                <Collapsible.Content className="motion-safe:data-[state=closed]:animate-collapseUp motion-safe:data-[state=open]:animate-collapseDown">
                    <div className="px-2 pb-6 pt-8 grid gap-4 mx-auto max-w-sm">{children}</div>
                </Collapsible.Content>
            </div>
        </Collapsible.RootProvider>
    )
}

export { InlineDrawer }
