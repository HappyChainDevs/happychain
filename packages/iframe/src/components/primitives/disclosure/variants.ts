import { cva } from "class-variance-authority"

// <details />
const disclosureDetailsRecipe = cva(
    "group cursor-pointer focus-within:ring-2 rounded-lg items-center [&_svg]:open:-rotate-180 [&_svg]:transition",
    {
        variants: {
            intent: {
                default: "bg-base-100",
                raw: "bg-base-100 p-0",
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
const disclosureSummaryRecipe = cva(
    "list-none text-sm p-4 font-semibold flex items-center justify-between cursor-pointer",
    {
        variants: {
            intent: {
                default: "",
                raw: "",
                gradient: "",
            },
        },
        defaultVariants: {
            intent: "default",
        },
    },
)

// <></>
const disclosureContentRecipe = cva("px-4 py-2 text-xs overflow-x-auto group-open:overflow-x-auto", {
    variants: {
        intent: {
            default: "",
            raw: "p-0",
            gradient: "",
        },
    },
    defaultVariants: {
        intent: "default",
    },
})

export { disclosureDetailsRecipe, disclosureSummaryRecipe, disclosureContentRecipe }
