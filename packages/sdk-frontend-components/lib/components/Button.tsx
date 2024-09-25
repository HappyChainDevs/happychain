/** @jsxImportSource preact */
import { type HTMLProps, forwardRef } from "preact/compat"

export const Button = forwardRef<HTMLButtonElement, HTMLProps<HTMLButtonElement>>(
    ({ className, children, ...props }, ref) => {
        return (
            <button type="button" className={`${className} happychain-badge`} ref={ref} {...props}>
                {children}
            </button>
        )
    },
)
