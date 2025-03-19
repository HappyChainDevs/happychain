import {
    Dialog as ArkDialog,
    type DialogBackdropProps,
    type DialogCloseTriggerProps,
    type DialogContentProps,
    type DialogPositionerProps,
    type DialogTriggerProps,
} from "@ark-ui/react/dialog"
import {
    type GuiButtonVariantsProps,
    type GuiDialogBackdropVariantsProps,
    type GuiDialogContentVariantsProps,
    type GuiDialogPositionerVariantsProps,
    recipeGuiDialog,
} from "@happy.tech/design-system"
import { cx } from "cva"
import { forwardRef } from "react"

interface GuiBackdropProps extends DialogBackdropProps, GuiDialogBackdropVariantsProps {}
export const GuiBackdrop = forwardRef<HTMLDivElement, GuiBackdropProps>(({ className = "", mode, ...props }, ref) => (
    <ArkDialog.Backdrop ref={ref} className={cx(recipeGuiDialog.backdrop({ mode }), className)} {...props} />
))

interface GuiPositionerProps extends DialogPositionerProps, GuiDialogPositionerVariantsProps {}
export const GuiPositioner = forwardRef<HTMLDivElement, GuiPositionerProps>(({ className = "", ...props }, ref) => (
    <ArkDialog.Positioner ref={ref} className={cx(recipeGuiDialog.positioner(props), className)} {...props} />
))

interface GuiContentProps extends DialogContentProps, GuiDialogContentVariantsProps {}
export const GuiContent = forwardRef<HTMLDivElement, GuiContentProps>(({ className = "", ...props }, ref) => (
    <ArkDialog.Content ref={ref} className={cx(recipeGuiDialog.content(props), className)} {...props} />
))

interface GuiTriggerProps extends DialogTriggerProps, GuiButtonVariantsProps {}
export const GuiTrigger = forwardRef<HTMLButtonElement, GuiTriggerProps>(
    ({ className = "", scale, aspect, intent, children, ...props }, ref) => (
        <ArkDialog.Trigger
            ref={ref}
            className={cx(recipeGuiDialog.trigger({ scale, aspect, intent }), className)}
            {...props}
        >
            {children}
        </ArkDialog.Trigger>
    ),
)

interface GuiCloseTriggerProps extends DialogCloseTriggerProps, GuiButtonVariantsProps {}
export const GuiCloseTrigger = forwardRef<HTMLButtonElement, GuiCloseTriggerProps>(
    ({ className = "", scale, aspect, intent, children, ...props }, ref) => (
        <ArkDialog.CloseTrigger
            ref={ref}
            className={cx(recipeGuiDialog.trigger({ scale, aspect, intent }), className)}
            {...props}
        >
            {children}
        </ArkDialog.CloseTrigger>
    ),
)
