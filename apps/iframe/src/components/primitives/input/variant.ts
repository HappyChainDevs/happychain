import { type VariantProps, cva } from "class-variance-authority"

// TODO: Not great that we have this + Input.tsx and recipeTextInput. Feels like it should be unified.
//       This is only used in FormSend.tsx, which afaict does not use Input.tsx because it needs the styling to apply
//       to a div and not the <input> directly, as there is a button inside the "visual input field".
//       We should refactor Input.tsx so that we always apply the style to the outer div, and allow passing in children.
//       Although maybe that is what causes the issue below, see NOTE.

/**
 * Recipe for styling text input-like UI elements (inputs, textareas)
 */
const recipeInput = cva(
    [
        // Input
        "w-full",
        "text-start",
        "text-neutral-12/90",
        // User activity: focus
        "focus:outline-none content-focused:ring-1 ",
        // Behaviour: disabled
        "input-disabled:opacity-60 input-disabled:cursor-not-allowed",

        // NOTE(norswap): Commented out the following — setting custom error validity via elem.setCustomValidity
        // is flaky on both Chrome and Firefox when used here, though Input.tsx + recipeTextInput is working fine.
        // (In particular, clearing the custom validity is unreliable. There are also browser differences.)
        //
        // Instead we apply this styling directly in the React component. Also note that if we want
        // error on styling before "blur" (focus out of input), we need to use this method anyway.

        // // State: error
        // "input-invalid:bg-error/15 input-invalid:ring-1 input-invalid:ring-error/60",
        // // State: error (dark mode)
        // "dark:input-invalid:bg-error/[0.08]",
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
