import { type VariantProps, cva } from "class-variance-authority"

/**
 * Recipe for styling text input-like UI elements (inputs, textareas)
 */
const recipeInput = cva(
    [
        // Input
        "w-full",
        "text-start",
        // User activity: focus
        "focus:outline-none content-focused:ring-2",
        // Behaviour: disabled
        "input-disabled:opacity-60 input-disabled:cursor-not-allowed",
        // State: error
        "input-invalid:bg-error/15 input-invalid:border-error/60",
        // State: error (dark mode)
        "dark:input-invalid:bg-error/5 dark:input-invalid:border-error/30",
    ],
    {
        variants: {
            intent: {
                default: [
                    // Input
                    "bg-base-100 border-neutral/25 dark:border-neutral/80",
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
