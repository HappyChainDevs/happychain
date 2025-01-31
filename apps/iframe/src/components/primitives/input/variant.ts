import { type VariantProps, cva } from "class-variance-authority"

/**
 * Brand styling for any UI element that implements a text-input like appearance/behaviour (textarea, some inputs)
 */
const recipeInput = cva(
    [
        // Input
        "w-full",
        "text-start",
        // User activity: focus
        "focus:outline-none focus:ring-2",
        // Behaviour: disabled
        "[&:is([aria-disabled=true],:disabled,:readonly)]:opacity-60 [&:is([aria-disabled=true],:disabled,:readonly)]:cursor-not-allowed",
        // State: error
        "dark:[&:is(:user-invalid,[aria-invalid=true])]:bg-error/5 [&:is(:user-invalid,[aria-invalid=true])]:bg-error/15 [&:is(:user-invalid,[aria-invalid=true])]:border-error/60 dark:[&:is(:user-invalid,[aria-invalid=true])]:border-error/30",
    ],
    {
        variants: {
            intent: {
                default: [
                    // Input
                    "bg-base-100 border-neutral/25 dark:border-neutral/80",
                    // Part: placeholder
                    "placeholder:text-neutral/50",
                ],
            },
            scale: {
                default: [
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

type InputVariantsProps = VariantProps<typeof recipeInput>

export { recipeInput, type InputVariantsProps }
