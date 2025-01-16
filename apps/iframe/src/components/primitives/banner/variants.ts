import { cva } from "class-variance-authority"

export const recipeBanner = cva(["border-2 rounded-lg", "flex items-center", "gap-2 p-2", "relative"], {
    variants: {
        intent: {
            info: "border-info bg-info/15", // @todo - setup color-mix tailwind plugin and use it to improve variants
            warning: "border-warning bg-warning/15", // @todo - setup color-mix tailwind plugin and use it to improve variants
            error: "border-error bg-error/15", // @todo - setup color-mix tailwind plugin and use it to improve variants
        },
    },
    defaultVariants: {
        intent: "warning",
    },
})
