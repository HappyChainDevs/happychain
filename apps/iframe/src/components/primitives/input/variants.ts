import { cva } from "class-variance-authority"

/**
 * Brand styling for any UI element that implements a way for the user to enter text (text field input, textarea, combobox...)
 */
export const recipeTextInput = cva(
    [
        // Input
        "w-full",
        "text-start",
        "text-neutral-12/90",
        // User activity: focus
        "focus:outline-none focus:ring-2 focus:ring-opacity-25",
        // Behaviour: disabled
        "[&:is([aria-disabled=true],:disabled)]:opacity-[.35] [&:is([aria-disabled=true],:disabled)]:cursor-not-allowed",
        // State: invalid
        "[&:is(:invalid,[aria-invalid=true]):not(:placeholder-shown),[data-novalidation]]:border-negative-9",
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
            },
        },
        defaultVariants: {
            intent: "default",
            scale: "default",
        },
    },
)
