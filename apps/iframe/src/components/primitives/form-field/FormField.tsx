import type { HTMLArkProps } from "@ark-ui/react"
import { cx } from "class-variance-authority"
import type { PropsWithChildren } from "react"

export const FormField = ({ children }: PropsWithChildren) => {
    return <div className="grid gap-1 [&:focus-within_label]:opacity-100">{children}</div>
}

interface FormFieldLabelProps extends HTMLArkProps<"label"> {
    isOptional?: boolean
}
export const FormFieldLabel = ({ children, isOptional, className, ...labelProps }: FormFieldLabelProps) => {
    return (
        // biome-ignore lint/a11y/noLabelWithoutControl: you should add htmlFor to `<FormFieldLabel>` anyway
        <label
            {...labelProps}
            className={cx("text-xs opacity-80 inline-flex gap-[1ex] items-baseline", className ?? "")}
        >
            {children}
            {isOptional && <span className="opacity-90 text-[0.8725em]">(optional)</span>}
        </label>
    )
}
