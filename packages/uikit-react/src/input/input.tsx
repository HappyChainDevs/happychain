import { forwardRef } from "react";
import { GuiInput, type GuiInputProps } from "./gui";

interface InputProps {};

const Root = forwardRef<HTMLElement, InputProps>((props, ref) => {
  return null;
});

const Gui = forwardRef<HTMLInputElement, GuiInputProps>((props, ref) => {
  return <GuiInput ref={ref} {...props} />;
});

/**
 * A text field that allows the user to write or edit a value.
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input} `<input>` element API Reference
 * 
 * @example - Basic input
 * import { Input } from '@happy.tech/uikit-react';
 * 
 * const SearchInput = () => {
 *   return (
 *     <Input.Gui 
 *       type="search"
 *       onInput={() => console.log("wow!")}
 *       placeholder="Search..." 
 *       aria-label="Search"
 *     />
 *   );
 * }
 */
const Input = Object.assign(Root, {
  Gui,
});

Input.displayName = "Input";

export { Input };
