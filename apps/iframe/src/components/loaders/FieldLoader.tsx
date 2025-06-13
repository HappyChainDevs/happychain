import { cva, type VariantProps } from "class-variance-authority"

const fieldLoaderVariants = cva("bg-primary-content rounded animate-pulse", {
    variants: {
        size: {
            xs: "w-16 h-3",    // 64px width, 12px height
            sm: "w-24 h-3.5",  // 96px width, 14px height
            md: "w-32 h-4",    // 128px width, 16px height (original size)
            lg: "w-40 h-5",    // 160px width, 20px height
            xl: "w-48 h-6",    // 192px width, 24px height
        },
    },
    defaultVariants: {
        size: "md",
    },
})

interface FieldLoaderProps extends VariantProps<typeof fieldLoaderVariants> {}

/**
 * Minor loader component to be used when representing
 * loading data for certain parameters / fields.
 */
export const FieldLoader = ({ size }: FieldLoaderProps) => {
    return <div className={fieldLoaderVariants({ size })} />
}