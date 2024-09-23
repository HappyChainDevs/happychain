import type { ButtonHTMLAttributes } from "preact/compat"

export function Button({ className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button type="button" className={`${className} happychain-badge`} {...props}>
            {children}
        </button>
    )
}
