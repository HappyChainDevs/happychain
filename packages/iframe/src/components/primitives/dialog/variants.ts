import { cva } from "class-variance-authority"

/**
 * Styling recipe for the custom header parts of dialogs
 * Use this in any custom component that serves as a header for your dialog
 */
const recipeDialogHeadline = cva(["w-full"], {
    variants: {
        // If the header has a visual continuity (ie: background color, border color) with another element
        continuity: {
            default: "",
            header: "bg-base-200 text-base-content",
        },
        spacing: {
            default: "",
            tight: "gap-[1.5ex]",
        },
        scale: {
            default: "pb-2",
        },
        label: {
            default: "font-bold",
        },
    },
    defaultVariants: {
        continuity: "default",
        scale: "default",
        label: "default",
    },
})

/**
 * Styling recipe for the custom body of dialogs
 * Use this in any custom component that serves as a body (wrapper) for your dialog
 * (Notice: we consider the custom component you will use is a child of Dialog.content)
 */
const recipeDialogBody = cva("", {
    variants: {
        spacing: {
            default: "py-2",
        },
    },
    defaultVariants: {
        spacing: "default",
    },
})

/**
 * Styling recipe for custom action control elements that appear as if they are in a header
 * Use this in Dialog.CloseTrigger components.
 * Notice: the positioning of this element is affected by where you place your Dialog in the markup (it will use the closest parent with `relative` positioning)
 */
const recipeDialogHeaderActionsControls = cva(
    ["focus:outline-none fixed p-2 aspect-square flex items-center justify-center rounded-full"],
    {
        variants: {
            layer: {
                default: "",
                header: ["top-[0.625rem] hover:bg-base-100/5 focus-within:bg-neutral/5"],
            },
            alignmentX: {
                default: "",
                start: ["start-0"],
                end: ["end-2"],
            },
        },
        defaultVariants: {
            layer: "header",
            alignmentX: "default",
        },
    },
)

export { recipeDialogBody, recipeDialogHeaderActionsControls, recipeDialogHeadline }
