import { type VariantProps, cva } from "class-variance-authority"

/**
 * Brand styling for any UI element that implements a button-like appearance/behaviour (button, link)
 */
const recipeButton = cva(
    [
        "inline-flex items-center cursor-pointer no-underline font-body",
        "[&:is([aria-disabled=true],:disabled)]:opacity-50 [&:is([aria-disabled=true],:disabled)]:cursor-not-allowed",
        "focus:outline-none",
    ],
    {
        variants: {
            intent: {
                primary: "text-primary-content bg-primary focus:bg-error/95 border-transparent", // @todo - setup color-mix tailwind plugin and use it to improve variants
                secondary: "btn dark:bg-neutral hover:bg-primary/15 focus:bg-primary/25 border-transparent",
                ghost: "text-neutral/75 hover:bg-neutral/10 focus:bg-neutral/15 border-transparent",
                "ghost-negative": "text-error hover:bg-error/10 focus:bg-error/15 border-transparent",
                "outline-negative": "text-error border-neutral/10 hover:bg-error/10 focus:bg-error/15",
            },
            scale: {
                default: "py-[1.15ch] px-[2ex] border",
            },
            label: {
                default: "font-bold",
            },
            edge: {
                default: "",
                sharp: "rounded-none",
                circle: "rounded-full",
            },
        },
        compoundVariants: [
            {
                scale: "default",
                edge: "default",
                class: "rounded-md",
            },
        ],
        defaultVariants: {
            intent: "primary",
            scale: "default",
            label: "default",
            edge: "default",
        },
    },
)

type ButtonVariantsProps = VariantProps<typeof recipeButton>

export { recipeButton, type ButtonVariantsProps }
