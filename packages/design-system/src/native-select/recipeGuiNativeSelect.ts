import { cx } from "cva"
import { recipeGuiUserInput, type GuiUserInputVariantsProps } from "../user-input/recipeGuiUserInput";
import { recipeGuiExpandable } from "../expandable/recipeGuiExpandable";
import { recipeBaseNativeSelect, type NativeSelectBaseVariantsProps } from "./recipeBaseNativeSelect";

export interface GuiNativeSelectVariantsProps extends GuiUserInputVariantsProps, NativeSelectBaseVariantsProps {}

/**
 * Visual pattern for native select dropdown elements that mimic the minimalistic, retro look
 * of early graphics-based operating systems.
 * 
 * This recipe combines multiple component recipes:
 * - recipeBaseNativeSelect: Provides base functionality for select elements
 * - recipeGuiExpandable: Adds expandable behavior with caret indicators
 * - recipeGuiUserInput: Applies GUI-specific styling for form inputs
 * 
 * The recipe adds special handling for the indicator element, displaying an upward caret
 * when the select is focused.
 * 
 * @variant All variants from recipeGuiInput are supported
 * @variant All variants from recipeBaseNativeSelect are supported
 * 
 * @example - Basic native select dropdown
 * ```tsx
 * <div className="relative group">
 *   <select className={recipeGuiNativeSelect()}>
 *     <option value="">Select an option</option>
 *     <option value="option1">Option 1</option>
 *     <option value="option2">Option 2</option>
 *     <option value="option3">Option 3</option>
 *   </select>
 *   <span data-expandable-indicator></span>
 * </div>
 * ```
 * 
 * @note The select element should be wrapped in a container with the "group" class for proper indicator behavior.
 * @note The indicator element must have the data-expandable-indicator attribute.
 * @note The indicator changes from down to up caret when the select element is focused.
 */
export const recipeGuiNativeSelect = (props?: GuiNativeSelectVariantsProps) => {
  return cx(
    "**:data-expandable-indicator:group-focus-within:mask-icon-hds-system-gui-caret-up",
    recipeBaseNativeSelect(),
    recipeGuiExpandable(props), 
    recipeGuiUserInput(props))
}
