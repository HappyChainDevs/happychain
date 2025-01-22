import { cva } from "class-variance-authority"

/**
 * Styling recipe for the popover-based positioner parts of a component
 * Use this in components like Menu.Positioner, Popover.Positioner, Dialog.Positioner, Dropdown.Positioner etc.
 */
const recipePositioner = cva("", {
    variants: {
        mode: {
            default: "",
            modal: "flex justify-center absolute z-[99] pointer-events-none overflow-hidden start-0 size-full",
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

const recipeContent = cva(["min-h-fit size-full inset-0 relative data-[state=open]:flex flex-col"], {
    variants: {
        animation: {
            default: "",
            modal: "motion-safe:[&[data-state=open]_[data-part=wrapper]]:animate-growIn motion-safe:[&[data-state=closed]_[data-part=wrapper]]:animate-growOut",
        },
        intent: {
            default: "bg-base-100",
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
})

export { recipePositioner, recipeContent }
