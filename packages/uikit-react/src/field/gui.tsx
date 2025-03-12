import {
    Field as ArkField,
    type FieldErrorTextProps,
    type FieldHelperTextProps,
    type FieldInputProps,
    type FieldLabelProps,
    type FieldRootProps,
    type FieldSelectProps,
    type FieldTextareaProps,
} from "@ark-ui/react/field"
import {
    type GuiFormFieldContainerVariantsProps,
    type GuiFormFieldErrorTextVariantsProps,
    type GuiFormFieldHelperTextVariantsProps,
    type GuiFormFieldLabelVariantsProps,
    type GuiNativeSelectVariantsProps,
    type GuiUserInputVariantsProps,
    recipeGuiFormField,
} from "@happy.tech/design-system"
import { cx } from "cva"
import { forwardRef } from "react"

interface GuiContainerProps extends FieldRootProps, GuiFormFieldContainerVariantsProps {}
export const GuiContainer = forwardRef<HTMLDivElement, GuiContainerProps>(({ className = "", ...props }, ref) => (
    <ArkField.Root ref={ref} className={recipeGuiFormField.parent({ className })} {...props} />
))

interface GuiLabelProps extends FieldLabelProps, GuiFormFieldLabelVariantsProps {}
export const GuiLabel = forwardRef<HTMLLabelElement, GuiLabelProps>(({ className = "", scale, ...props }, ref) => (
    <ArkField.Label ref={ref} className={cx(recipeGuiFormField.label({ scale }), className)} {...props} />
))

interface GuiInputProps extends FieldInputProps, GuiUserInputVariantsProps {}
export const GuiInput = forwardRef<HTMLInputElement, GuiInputProps>(({ className = "", scale, ...props }, ref) => (
    <ArkField.Input
        ref={ref}
        data-hds="input"
        className={cx(recipeGuiFormField.input({ scale }), className)}
        {...props}
    />
))

interface GuiTextareaProps extends FieldTextareaProps, GuiUserInputVariantsProps {}
export const GuiTextarea = forwardRef<HTMLTextAreaElement, GuiTextareaProps>(
    ({ className = "", scale, ...props }, ref) => (
        <ArkField.Textarea
            ref={ref}
            data-hds="input"
            className={cx(recipeGuiFormField.input({ scale }), className)}
            {...props}
        />
    ),
)

interface GuiSelectProps extends FieldSelectProps, GuiNativeSelectVariantsProps {}
export const GuiSelect = forwardRef<HTMLSelectElement, GuiSelectProps>(({ className = "", scale, ...props }, ref) => (
    <div className={cx(recipeGuiFormField.select({ scale }), className)}>
        <ArkField.Select ref={ref} data-hds="input" {...props} />
        <span data-expandable-indicator />
    </div>
))

interface GuiHelperTextProps extends FieldHelperTextProps, GuiFormFieldHelperTextVariantsProps {}
export const GuiHelperText = forwardRef<HTMLSpanElement, GuiHelperTextProps>(({ className = "", ...props }, ref) => (
    <ArkField.HelperText ref={ref} className={recipeGuiFormField.helperText(className)} {...props} />
))

interface GuiErrorTextProps extends FieldErrorTextProps, GuiFormFieldErrorTextVariantsProps {}
export const GuiErrorText = forwardRef<HTMLSpanElement, GuiErrorTextProps>(
    ({ className = "", scale, ...props }, ref) => (
        <ArkField.ErrorText ref={ref} className={cx(recipeGuiFormField.errorText({ scale }), className)} {...props} />
    ),
)
