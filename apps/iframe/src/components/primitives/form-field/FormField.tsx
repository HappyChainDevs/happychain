import {
    Field as ArkField,
    type FieldErrorTextProps,
    type FieldHelperTextProps,
    type FieldInputProps,
    type FieldLabelProps,
    type FieldRootProps,
    type FieldTextareaProps,
} from "@ark-ui/react/field"
import { cx } from "class-variance-authority"
import { forwardRef } from "react"
import { type InputVariantsProps, recipeInput } from "../input/variants"

interface ContainerProps extends FieldRootProps {}
const Container = forwardRef<HTMLDivElement, ContainerProps>(({ className = "", ...props }, ref) => (
    <ArkField.Root ref={ref} className={cx("grid gap-1 group", className)} {...props} />
))

interface LabelProps extends FieldLabelProps {}
const Label = forwardRef<HTMLLabelElement, LabelProps>(({ className = "", children, ...props }, ref) => (
    <ArkField.Label
        ref={ref}
        className={cx(
            "text-xs  opacity-80 group-focus-within:opacity-100 inline-flex gap-[1ex] items-baseline",
            className ?? "",
        )}
        {...props}
    >
        {children}
        <span className="group-has-[[data-required]]:hidden opacity-90 text-[0.8725em]">(optional)</span>
    </ArkField.Label>
))

interface InputProps extends FieldInputProps, InputVariantsProps {}
const Input = forwardRef<HTMLInputElement, InputProps>(({ className = "", scale, intent, ...props }, ref) => (
    <ArkField.Input ref={ref} className={cx(recipeInput({ scale, intent }), className)} {...props} />
))

interface TextareaProps extends FieldTextareaProps, InputVariantsProps {}
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({ className = "", scale, intent, ...props }, ref) => (
    <ArkField.Textarea ref={ref} className={cx(recipeInput({ scale, intent }), className)} {...props} />
))

interface HelperTextProps extends FieldHelperTextProps {}
const HelperText = forwardRef<HTMLSpanElement, HelperTextProps>(({ className = "", ...props }, ref) => (
    <ArkField.HelperText ref={ref} className={className ? className : "sr-only"} {...props} />
))

interface ErrorTextProps extends FieldErrorTextProps {}
const ErrorText = forwardRef<HTMLSpanElement, ErrorTextProps>(({ className = "", ...props }, ref) => (
    <ArkField.ErrorText
        ref={ref}
        className={cx(
            "text-start text-error/80 text-xs group-has-[:not(:user-invalid):placeholder-shown]:hidden",
            className,
        )}
        {...props}
    />
))

const Root = Container
export const FormField = Object.assign(Root, {
    ...ArkField,
    Root: Container,
    Input,
    Textarea,
    Label,
    ErrorText,
    HelperText,
    Unstyled: {
        ...ArkField,
    },
})
