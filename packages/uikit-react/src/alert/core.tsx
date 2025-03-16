import { createContext, forwardRef, useContext, useId } from "react"
import type { PropsWithChildren } from "react"
import { ark, type HTMLArkProps } from "@ark-ui/react"
import type { GuiAlertContainerVariantsProps } from "@happy.tech/design-system"


/**
 * Context to share props between the different alert parts.
 * @internal
 */
export type AlertContextValue = {
  intent?: string
  scale?: string 
  aspect?: string
  /** Unique ID for accessibility connection */
  titleId?: string
}

const AlertContext = createContext<AlertContextValue | undefined>(undefined)
export function useAlertContext() {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error("Alert compound components must be used within an Alert.Root component")
  }
  return context
}

export interface AlertRootProps extends HTMLArkProps<"div">, GuiAlertContainerVariantsProps, PropsWithChildren {}

const Root = forwardRef<HTMLDivElement, AlertRootProps>((props, ref) => {
  const {
    intent = "default",
    scale = "default",
    aspect = "default",
    children,
    ...rest
  } = props

  const titleId = useId()

  return (
    <AlertContext.Provider
      value={{
        intent,
        scale,
        aspect,
        titleId,
      }}
    >
      <ark.div
        ref={ref}
        role="alert"
        data-scope="alert"
        data-part="root"
        aria-live={["negative", "warning"].includes(intent) ? "assertive" : "polite"}
        data-intent={intent}
        {...rest}
      >
        {children}
      </ark.div>
    </AlertContext.Provider>
  )
})

export interface AlertIconProps extends HTMLArkProps<"div">, PropsWithChildren {}
const Icon = forwardRef<HTMLDivElement, AlertIconProps>((props, ref) => {
  const { children, ...rest } = props
  return (
    <ark.div
      ref={ref}
      data-scope="alert"
      data-part="icon"
      {...rest}
    >
      {children}
    </ark.div>
  )
})

export interface AlertTitleProps extends HTMLArkProps<"h1">, PropsWithChildren {}
const Title = forwardRef<HTMLDivElement, AlertTitleProps>((props, ref) => {
  const { children, ...rest } = props
  const { titleId } = useAlertContext()

  return (
    <ark.h1
      ref={ref}
      id={titleId}
      data-scope="alert"
      data-part="title"
      {...rest}
    >
      {children}
    </ark.h1>
  )
})

export interface AlertDescriptionProps extends HTMLArkProps<"p">, PropsWithChildren {}
const Description = forwardRef<HTMLDivElement, AlertDescriptionProps>((props, ref) => {
  const { children, ...rest } = props

  return (
    <ark.p
      ref={ref}
      data-scope="alert"
      data-part="description"
      {...rest}
    >
      {children}
    </ark.p>
  )
})

export interface AlertActionsProps extends HTMLArkProps<"div">, PropsWithChildren {}
const Actions = forwardRef<HTMLDivElement, AlertActionsProps>((props, ref) => {
  const { children, ...rest } = props
  useAlertContext()

  return (
    <ark.div
      ref={ref}
      data-scope="alert"
      data-part="actions"
      {...rest}
    >
      {children}
    </ark.div>
  )
})

export interface AlertTriggerActionProps extends HTMLArkProps<"button">, PropsWithChildren {}
const TriggerAction = forwardRef<HTMLButtonElement, AlertTriggerActionProps>((props, ref) => {
  const { children, ...rest } = props
  useAlertContext()

  return (
    <ark.button
      ref={ref}
      data-scope="alert"
      data-part="trigger"
      {...rest}
    >
      {children}
    </ark.button>
  )
})

Root.displayName = 'Alert'
Icon.displayName = 'Alert.Icon'
Title.displayName = 'Alert.Title'
Description.displayName = 'Alert.Description'
Actions.displayName = 'Alert.Actions'
TriggerAction.displayName = 'Alert.TriggerAction'

/**
 * A headless, composable alert component.
 * Provides the foundation for paradigm-specific implementations.
 * 
 * @example 
 * ```tsx
 * <Alert intent="error">
 *   <Alert.Icon />
 *   <Alert.Title>Attention required</Alert.Title>
 *   <Alert.Description>Please allow popup in your browser and try again.</Alert.Description>
 *   <Alert.Actions>
 *     <Alert.TriggerAction>Try again</Alert.TriggerAction>
 *     <Alert.TriggerAction>Cancel</Alert.TriggerAction>
 *   </Alert.Actions>
 * </Alert>
 * ```
 */
export const Alert = Object.assign(Root, {
  Icon,
  Title,
  Description,
  Actions,
  TriggerAction,
})
