import { cva } from "class-variance-authority"

// <details />
const recipeDisclosureDetails = cva(
    "p-0 group cursor-pointer focus-within:ring-2 rounded-lg items-center [&_svg]:open:-rotate-180 [&_svg]:transition",
    {
        variants: {
            intent: {
                default: "bg-base-100",
                gradient:
                    "bg-gradient-to-br from-[rgb(56,189,248)] via-[rgb(109,40,217)] to-[rgba(241,253,79,0.65)] text-white shadow-lg",
            },
        },
        defaultVariants: {
            intent: "default",
        },
    },
)

// <summary />
const recipeDisclosureSummary = cva("list-none text-sm p-4 font-semibold flex justify-between cursor-pointer")

// <></>
const recipeDisclosureContent = cva("px-4 py-2 text-xs overflow-x-auto group-open:overflow-x-auto", {
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

export { recipeDisclosureDetails, recipeDisclosureSummary, recipeDisclosureContent }
