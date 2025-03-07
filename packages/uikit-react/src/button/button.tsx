import { forwardRef } from "react";
import { SkeuoButton, type SkeuoButtonProps } from "./skeuo";
import { GuiButton, type GuiButtonProps } from "./gui";

interface ButtonCoreProps {};

const Root = forwardRef<HTMLElement, ButtonCoreProps>((props, ref) => {
  return null;
});

const Gui = forwardRef<HTMLElement, GuiButtonProps>((props, ref) => {
  return <GuiButton ref={ref} {...props} />;
});

const Skeuo = forwardRef<HTMLElement, SkeuoButtonProps>((props, ref) => {
  return <SkeuoButton ref={ref} {...props} />;
});


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
 * @example - Skeuomorphic paradigm
 * import { Button } from '@happy.tech/uikit-react';
 * 
 * const ExampleSkeuoButton = () => {
 *   return (
 *     <Button.Skeuo>Hello from GUI !</Button.Skeuo>
 *   );
 * }
 * 
 * @example - As a link
 * import { Button } from '@happy.tech/uikit-react';
 * 
 * const ExampleLinkButton = () => {
 *   return (
 *     <Button.Gui aspect="ghost" href="https://example.com"> A link button</Button.Gui>
 *   );
 * }
 */
const Button = Object.assign(Root, {
  Gui,
  Skeuo,
});

Button.displayName = "Button";

export { Button }