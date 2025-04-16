import { cva } from "class-variance-authority"

/** Defines the container for a `<details>` element. */
const recipeDisclosureDetails = cva(
    "group w-full focus-within:ring-2 rounded-md items-center [&_svg]:open:-rotate-180 [&_svg]:transition border border-neutral/10",
    {
        variants: {
            intent: {
                default: "bg-base-100",
                gradient: "bg-gradient-to-br from-[rgb(56,189,248)] to-[rgb(109,40,217)] text-white",
                neutral: "bg-base-300/90 dark:bg-base-content text-neutral rounded-lg",
                developerInfo: "",
            },
        },
        defaultVariants: {
            intent: "default",
        },
    },
)

/** Defines the styles for the summary line for a `<details>` element. */
const recipeDisclosureSummary = cva("list-none max-w-prose text-sm py-2 px-2.5 flex justify-between mx-auto", {
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
const recipeDisclosureContent = cva("text-xs overflow-x-auto group-open:overflow-x-auto", {
    variants: {
        intent: {
            default: "",
            gradient: "",
            neutral: "text-neutral rounded-b-lg",
        },
    },
    defaultVariants: {
        intent: "default",
    },
})

export { recipeDisclosureDetails, recipeDisclosureSummary, recipeDisclosureContent }
