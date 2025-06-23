import { type ButtonHTMLAttributes, forwardRef } from "react"
import styles from "./Button.module.css"

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
    ({ className = "", children, ...props }, ref) => (
        <button {...props} className={[styles.root, className].join(" ").trim()} ref={ref}>
            {children}
        </button>
    ),
)
