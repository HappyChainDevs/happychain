import { forwardRef } from "react"
import { cx } from "cva"
import { Alert as CoreAlert, useAlertContext, type AlertActionsProps, type AlertDescriptionProps, type AlertIconProps, type AlertRootProps, type AlertTitleProps } from "./core"
import { recipeGuiAlert, type GuiAlertActionsVariantsProps, type GuiAlertContainerVariantsProps, type GuiAlertDescriptionVariantsProps, type GuiAlertIconVariantsProps, type GuiAlertTitleVariantsProps } from "@happy.tech/design-system"

interface GuiAlertContainerProps extends AlertRootProps {}
export const GuiContainer = forwardRef<HTMLDivElement, GuiAlertContainerProps>((props, ref) => {
  const { 
    className = '', 
    intent, 
    scale,
    aspect,
    children, 
    ...rest 
  } = props

  return (
    <CoreAlert
      ref={ref}
      intent={intent}
      scale={scale}
      aspect={aspect}
      className={cx(recipeGuiAlert.container({
        intent,
        scale,
        aspect
      }), className)}
      {...rest}
    >
      {children}
    </CoreAlert>
  )
})


interface GuiIconProps extends AlertIconProps, GuiAlertIconVariantsProps {}
export const GuiIcon = forwardRef<HTMLDivElement, GuiIconProps>((props, ref) => {
  const { className = '', intent, aspect, scale, children, ...rest } = props
  const rootProps = useAlertContext()
    return (
      <CoreAlert.Icon
        ref={ref}
        className={cx(recipeGuiAlert.icon({ 
          intent: intent ?? rootProps?.intent as GuiAlertIconVariantsProps["intent"] ,
          scale: scale ?? rootProps?.scale as GuiAlertIconVariantsProps["scale"] ,
          aspect: aspect ?? rootProps?.aspect as GuiAlertIconVariantsProps["aspect"] ,
        }), className )}
        {...rest}
      />
    )
})


interface GuiTitleProps extends AlertTitleProps, GuiAlertTitleVariantsProps {}
export const GuiTitle = forwardRef<HTMLDivElement, GuiTitleProps>((props, ref) => {
  const { className = '', scale, intent, children,  ...rest } = props
  const rootProps = useAlertContext()
  return (
    <CoreAlert.Title
      ref={ref}
      className={cx(
        recipeGuiAlert.title({
          intent: intent ?? rootProps?.intent as GuiAlertTitleVariantsProps["intent"] ,
          scale: scale ?? rootProps?.scale as GuiAlertTitleVariantsProps["scale"] ,
        }), className)}
      {...rest}
    >
      {children}
    </CoreAlert.Title>
  )
})


interface GuiDescriptionProps extends AlertDescriptionProps, GuiAlertDescriptionVariantsProps {}
export const GuiDescription = forwardRef<HTMLDivElement, GuiDescriptionProps>((props, ref) => {
  const { children, className = '', scale, intent, ...rest } = props
  const rootProps = useAlertContext()

  return (
    <CoreAlert.Description
      ref={ref}
      className={cx(
        recipeGuiAlert.description({
          intent: intent ?? rootProps?.intent as GuiAlertDescriptionVariantsProps["intent"] ,
          scale: scale ?? rootProps?.scale as GuiAlertDescriptionVariantsProps["scale"] ,
      }), className)}
      {...rest}
    >
      {children}
    </CoreAlert.Description>
  )
})


interface GuiActionsProps extends AlertActionsProps, GuiAlertActionsVariantsProps {}
export const GuiActions = forwardRef<HTMLDivElement, GuiActionsProps>((props, ref) => {
  const { children, className = '', scale, ...rest } = props
  const rootProps = useAlertContext()

  return (
    <CoreAlert.Actions
      ref={ref}
      className={cx(
        recipeGuiAlert.actions({
        scale: scale ?? rootProps?.scale as GuiAlertActionsVariantsProps["scale"],
      }), className)}
      {...rest}
    >
      {children}
    </CoreAlert.Actions>
  )
})
