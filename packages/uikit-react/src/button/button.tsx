import { forwardRef } from "react"
import { GuiButton, type GuiButtonProps } from "./gui"
import { SkeuoButton, } from "./skeuo"

type ButtonElement = HTMLButtonElement | HTMLAnchorElement | HTMLElement

const Root = forwardRef<HTMLElement>((_props, _ref) => {
    return null
})

const Gui = forwardRef<ButtonElement, GuiButtonProps>((props, ref) => {
    return <GuiButton ref={ref as any} {...props} />
})

const Skeuo = SkeuoButton

/**
 * A clickable element the user interacts with to trigger actions and events.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button} `<button>` element API Reference
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a} `<a>` element API Reference
 *
 * @example - GUI paradigm
 * import { Button } from '@happy.tech/uikit-react';
 *
 * const ExampleGuiButton = () => {
 *   return (
 *     <Button.Gui>Hello from GUI !</Button.Gui>
 *   );
 * }
 * 
 * @example - GUI link
 * import { Button } from '@happy.tech/uikit-react';
 *
 * const GuiAnchor = () => {
 *   return (
 *     <Button.Gui asChild>
 *        <a href="/">Gui link !</a>
 *     </Button.Gui>
 *   );
 * }
 * 
  * @example - Render as custom component (eg: router link component)
 * import { Button } from '@happy.tech/uikit-react';
 *
 * const CustomGuiLink = () => {
 *   return (
 *     <Button.Gui asChild>
 *        <Link to="/">Custom component !</a>
 *     </Button.Gui>
 *   );
 * }
 * @example - Skeuomorphic button
 * import { Button } from '@happy.tech/uikit-react';
 *
 * const ExampleSkeuoButton = () => {
 *   return (
 *     <Button.Skeuo>
 *       <Button.Skeuo.Label>Click me</Button.Skeuo.Label>
 *       <Button.Skeuo.Trigger />
 *     </Button.Skeuo>
 *   );
 * }
 *
 * @example - Skeuomorphic paradigm with custom <Link> component
 * import { Button } from '@happy.tech/uikit-react';
 *
 * const ExampleSkeuoLinkButton = () => {
 *   return (
 *     <Button.Skeuo>
 *       <Button.Skeuo.Label>Visit dashboard</Button.Skeuo.Label>
 *       <Button.Skeuo.Trigger asChild>
 *          <Link to="/dashboard">Open</Link>
 *       </Button.Skeuo.Trigger>
 *     </Button.Skeuo>
 *   );
 * }
 */
const Button = Object.assign(Root, {
    Gui,
    Skeuo,
})

Button.displayName = "Button"

export { Button, type GuiButtonProps }
