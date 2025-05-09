import { cva } from "class-variance-authority"

export const recipeTextInput = cva(
    [
        // Input
        "w-full",
        "text-start",
        "text-neutral-12/90",
        // User activity: focus
        "focus:outline-none content-focused:ring-1",
        // Behaviour: disabled
        "[&:is([aria-disabled=true],:disabled)]:opacity-[.35] [&:is([aria-disabled=true],:disabled)]:dark:opacity-[.50] [&:is([aria-disabled=true],:disabled)]:cursor-not-allowed [&:is([aria-disabled=true],:disabled)]:select-none",
        // Behaviour: readonly for inputs & textareas
        "[&:is(:read-only,[aria-readonly=true])]:focus:ring-0 [&:is(:read-only,[aria-readonly=true])]:select-none [&:is(:read-only,[aria-readonly=true])]:pointer-events-none [&:is(:read-only,[aria-readonly=true])]:caret-transparent [&:is(:read-only,[aria-readonly=true])]:touch-none [&:is(:read-only,[aria-readonly=true])]:placeholder-opacity-100",
    ],
    {
        variants: {
            intent: {
                default: [
                    // Input
                    "bg-base-100 border-neutral/25 dark:border-neutral/80",
                    // User activity: hover
                    "hover:border-neutral-11/30",
                    // User activity: focus
                    "focus:ring-primary-9 focus:border-neutral-11/50",
                    // Part: placeholder
                    "placeholder:text-neutral-11/50",
                ],
            },
            scale: {
                default: [
                    // Input
                    "py-2",
                    "border",
                    "rounded-md",
                    // Any text input that isn't a search input
                    "[&:not([type=search])]:ps-3",
                    // Any text input that isn't a combobox and that shows a placeholder (aka empty state, user didn't type anything yet)
                    "[&:is(:not(:not(:placeholder-shown)),:not([role=combobox]))]:pe-3",
                ],
                // NOTE(norswap): hackfix to make recipient input have same font-size as amount on send page
                small: [
                    // Input
                    "text-xs",
                    "min-h-9",
                    "px-[1ex]",
                    "py-[0.25em]",
                    "border",
                    "rounded-md",
                ],
            },
        },
        defaultVariants: {
            intent: "default",
            scale: "default",
        },
    },
)
