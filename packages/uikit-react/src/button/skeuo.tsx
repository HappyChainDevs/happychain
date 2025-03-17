import { type HTMLArkProps, ark } from "@ark-ui/react"
import { type SkeuoButtonVariantsProps, recipeSkeuoButton } from "@happy.tech/design-system"
import { createContext, forwardRef, useContext, useId } from "react"
import type { PropsWithChildren } from "react"

/**
 * Context to share props between the different skeuomorphic button parts.
 * @internal
 */
type SkeuoButtonContext = {
    intent?: SkeuoButtonVariantsProps["intent"]
    scale?: SkeuoButtonVariantsProps["scale"]
    depth?: SkeuoButtonVariantsProps["depth"]
    alignItems?: SkeuoButtonVariantsProps["alignItems"]
    justifyContent?: SkeuoButtonVariantsProps["justifyContent"]

    /** Unique ID for accessibility connection between visible label and interactive element */
    labelId?: string
}

const SkeuoButtonContext = createContext<SkeuoButtonContext>({})

interface RootProps extends SkeuoButtonVariantsProps, HTMLArkProps<"div">, PropsWithChildren {}
const Root = forwardRef<HTMLDivElement, RootProps>((props, ref) => {
    const { intent, scale, depth, alignItems, justifyContent, className, children, ...rest } = props

    const labelId = useId()

    return (
        <SkeuoButtonContext.Provider
            value={{
                intent,
                scale,
                depth,
                alignItems,
                justifyContent,
                labelId,
            }}
        >
            <div ref={ref} className={recipeSkeuoButton.parent({ className })} {...rest}>
                <span data-part="cuttout" className={recipeSkeuoButton.cuttout({ intent, scale })}>
                    <span data-part="texture" className={recipeSkeuoButton.texture({ intent, scale })}>
                        <span data-part="positioner" className={recipeSkeuoButton.positioner()}>
                            {children}
                            <span data-part="recess" className={recipeSkeuoButton.recess({ intent, scale, depth })} />
                        </span>
                    </span>
                </span>
            </div>
        </SkeuoButtonContext.Provider>
    )
})

interface LabelProps extends HTMLArkProps<"span">, PropsWithChildren {}

/**
 * The visible label part of the skeuomorphic button.
 *
 * @example
 * ```tsx
 * <SkeuoButton.Label>I'm visible !</SkeuoButton.Label>
 * ```
 */
const Label = forwardRef<HTMLSpanElement, LabelProps>((props, ref) => {
    const { children, className, ...rest } = props
    const { intent, scale, justifyContent, alignItems, labelId } = useContext(SkeuoButtonContext)

    return (
        <span
            ref={ref}
            className={recipeSkeuoButton.label({
                intent,
                scale,
                justifyContent,
                alignItems,
                className,
            })}
            id={labelId}
            data-part="label"
            {...rest}
        >
            {children}
        </span>
    )
})

interface TriggerProps extends HTMLArkProps<"button">, PropsWithChildren {}
/**
 * The interactive trigger component of the skeuomorphic button.
 * This is the component that handles user interactions and events.
 * It's visually hidden but handles all the button functionality.
 *
 * @example - Basic usage
 * ```tsx
 * <SkeuoButton.Trigger type="button" onClick={handleClick}>
 *    Basic hidden trigger!
 * </SkeuoButton.Trigger>
 *
 *
 * @example - With custom element
 * ```
 * <SkeuoButton.Trigger asChild>
 *   <Link to="/dashboard">Go to dashboard</Link>
 * </SkeuoButton.Trigger>
 * ```
 */
const Trigger = forwardRef<HTMLButtonElement, TriggerProps>((props, ref) => {
    const { children, className, asChild, ...rest } = props
    const { labelId } = useContext(SkeuoButtonContext)

    return (
        <ark.button
            ref={ref}
            className={recipeSkeuoButton.interactiveElement({ className })}
            data-part="interactive-element"
            aria-labelledby={labelId}
            asChild={asChild}
            {...rest}
        >
            {children}
        </ark.button>
    )
})

Root.displayName = "SkeuoButton"
Label.displayName = "SkeuoButton.Label"
Trigger.displayName = "SkeuoButton.Trigger"

/**
 * @example - Basic usage
 * ```tsx
 * <SkeuoButton>
 *   <SkeuoButton.Label>Click me</SkeuoButton.Label>
 *   <SkeuoButton.Trigger onClick={() => alert('Clicked!')} />
 * </SkeuoButton>
 * ```
 *
 * @example - Rendering a custom component instead of a `<button>`
 * ```tsx
 * <SkeuoButton>
 *   <SkeuoButton.Label>Go to Dashboard</SkeuoButton.Label>
 *   <SkeuoButton.Trigger asChild>
 *     <Link to="/dashboard" />
 *   </SkeuoButton.Trigger>
 * </SkeuoButton>
 * ```
 */
export const SkeuoButton = Object.assign(Root, {
    Label,
    Trigger,
})
