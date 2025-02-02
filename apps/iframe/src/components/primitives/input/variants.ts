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
        "focus:outline-none focus:ring-4 focus:ring-opacity-25",
        // Behaviour: disabled
        "[&:is([aria-disabled=true],:disabled)]:opacity-60 [&:is([aria-disabled=true],:disabled)]:cursor-not-allowed",
        // State: invalid
        "[&:is(:invalid,[aria-invalid=true]):not(:placeholder-shown),[data-novalidation]]:border-negative-9",
    ],
    {
        variants: {
            intent: {
                default: [
                    // Input
                    "bg-neutral-3 border-neutral-11/20 bg-mix-base bg-mix-amount-80",
                    // User activity: hover
                    "hover:border-neutral-11/30",
                    // User activity: focus
                    "focus:ring-primary-9 focus:border-neutral-11/50",
                    // Part: placeholder
                    "placeholder:text-neutral-11/50",
                ],
                // Input
                ghost: [
                    "border-transparent bg-transparent",
                    // User activity: focus
                    "focus:ring-transparent",
                    // Part: placeholder
                    "focus:placeholder:text-neutral-11/70",
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
                    // Any text input not showing a placeholder (aka user typed something) and that isn't a textarea
                    "[&:not(:placeholder-shown,[data-novalidation],textarea)]:pe-10",
                ],
            },
        },
        defaultVariants: {
            intent: "default",
            scale: "default",
        },
    },
)
