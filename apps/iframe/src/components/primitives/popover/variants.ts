import { cva } from "class-variance-authority"

/**
 * Styling recipe for the popover-based positioner parts of a component
 * Use this in components like Menu.Positioner, Popover.Positioner, Dialog.Positioner, Dropdown.Positioner etc.
 */
const recipePositioner = cva("", {
    variants: {
        mode: {
            default: "",
            modal: [
                "flex justify-center", //
                "absolute z-[99]",
                "pointer-events-none start-0 size-full",
            ],
        },
        originY: {
            default: "",
            bottom: "bottom-0",
        },
    },
    defaultVariants: {
        mode: "default",
        originY: "default",
    },
})

const recipeContent = cva(
    [
        "min-h-fit size-full", //
        "inset-0 relative",
        "data-[state=open]:flex flex-col rounded-md",
    ],
    {
        variants: {
            animation: {
                default: "",
                modal: "motion-safe:[&[data-state=open]_[data-part=wrapper]]:animate-growIn motion-safe:[&[data-state=closed]_[data-part=wrapper]]:animate-growOut",
            },
            intent: {
                // needs extra ff-scrollbar-padding fix due to position 'absolute' of the popover
                default: "bg-base-200 ff-scrollbar-px",
            },
            scale: {
                default: "text-sm",
            },
        },
        defaultVariants: {
            animation: "default",
            intent: "default",
            scale: "default",
        },
    },
)

export { recipePositioner, recipeContent }
