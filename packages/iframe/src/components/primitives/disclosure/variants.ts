import { cva } from "class-variance-authority"

/** Defines the container for a `<details>` element. */
const recipeDisclosureDetails = cva(
    "p-0 group cursor-pointer focus-within:ring-2 rounded-lg items-center [&_svg]:open:-rotate-180 [&_svg]:transition",
    {
        variants: {
            intent: {
                default: "bg-base-100",
                gradient: "bg-gradient-to-br from-[rgb(56,189,248)] to-[rgb(109,40,217)] text-white shadow-lg",
                neutral: "bg-base-content text-gray-800 shadow border border-gray-200 rounded-lg",
                developerInfo: "",
            },
        },
        defaultVariants: {
            intent: "default",
        },
    },
)

/** Defines the styles for the summary line for a `<details>` element. */
const recipeDisclosureSummary = cva("list-none text-sm p-4 font-semibold flex justify-between cursor-pointer", {
    variants: {
        intent: {
            default: "",
            gradient: "",
        },
    },
    defaultVariants: {
        intent: "default",
    },
})

/** Defines the content area of a collapsible `<details>` element. */
const recipeDisclosureContent = cva("px-4 py-2 text-xs overflow-x-auto group-open:overflow-x-auto", {
    variants: {
        intent: {
            default: "",
            gradient: "",
            neutral: "bg-base-content text-gray-800 border-t border-gray-200 shadow-sm rounded-b-lg",
        },
    },
    defaultVariants: {
        intent: "default",
    },
})

export { recipeDisclosureDetails, recipeDisclosureSummary, recipeDisclosureContent }
