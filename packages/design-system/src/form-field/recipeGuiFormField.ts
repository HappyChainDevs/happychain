import { cva, type VariantProps } from "cva";
import { recipeGuiUserInput, type GuiUserInputVariantsProps } from '../user-input';
import { recipeGuiNativeSelect, type GuiNativeSelectVariantsProps } from "../native-select";

const recipeGuiFormFieldContainer = cva({
    base: [
        "flex flex-col",
    ],
})
export type GuiFormFieldContainerVariantsProps = VariantProps<typeof recipeGuiFormFieldContainer>

const recipeGuiFormFieldLabel = cva({
    base: "font-hds-system-gui-display text-hds-system-gui-foreground-default text-hds-system-gui-base",
    variants: {
        scale: {
            default: "pb-2",
        }
    },
    defaultVariants: {
        scale: 'default'
    }
})
export type GuiFormFieldLabelVariantsProps = VariantProps<typeof recipeGuiFormFieldLabel>


const recipeGuiFormFieldHelperText = cva({
    base: ['sr-only'],
})
export type GuiFormFieldHelperTextVariantsProps = VariantProps<typeof recipeGuiFormFieldHelperText>


const recipeGuiFormFieldErrorText = cva({
    base: "font-hds-system-gui-display text-hds-system-gui-foreground-intent-negative text-hds-system-gui-base",
    variants: {
        scale: {
            default: "pt-1.5",
        }
    },
    defaultVariants: {
        scale: 'default'
    }
})
export type GuiFormFieldErrorTextVariantsProps = VariantProps<typeof recipeGuiFormFieldErrorText>


/**
 * Visual pattern for form fields that mimic the minimalistic, retro look of early graphics-based
 * operating systems. Provides a complete set of styles for creating accessible form elements.
 * 
 * This recipe consists of multiple related elements:
 * - parent: Container that groups form field elements
 * - label: Text label for the form field
 * - helperText: Additional descriptive text (screen-reader only by default)
 * - errorText: Text for validation error messages
 * - input: Text input field (uses recipeGuiUserInput)
 * - select: Dropdown select field (uses recipeGuiNativeSelect)
 * - textarea: Multiline text input (uses recipeGuiUserInput)
 * 
 * @variant `scale` - Controls the spacing and dimensions
 * @example - Complete form field with label, input, and error message
 * ```tsx
 * <div className={recipeGuiFormField.parent()}>
 *   <label 
 *     htmlFor="email-input" 
 *     className={recipeGuiFormField.label()}
 *   >
 *     Your e-mail address
 *   </label>
 *   <span 
 *     id="email-helper" 
 *     className={recipeGuiFormField.helperText()}
 *   >
 *     Enter your e-mail address for account recovery
 *   </span>
 *   <input 
 *     id="email-input"
 *     type="email"
 *     aria-describedby="email-helper email-error"
 *     className={recipeGuiFormField.input()}
 *   />
 *   <span 
 *     id="email-error" 
 *     className={recipeGuiFormField.errorText()}
 *   >
 *     Please enter a valid e-mail address
 *   </span>
 * </div>
 * ```
 * 
 * @note Always connect labels to inputs using for/htmlFor and id attributes for accessibility.
 * @note Use aria-describedby to link inputs with helper and error text.
 * @note The helper text is visually hidden by default but available to screen readers.
 * @note The input, select, and textarea elements use their respective recipes and support all their variants.
 */
export const recipeGuiFormField = {
    parent: (props: GuiFormFieldContainerVariantsProps) => recipeGuiFormFieldContainer(props),
    label: (props: GuiFormFieldLabelVariantsProps) => recipeGuiFormFieldLabel(props),
    helperText: (props: GuiFormFieldHelperTextVariantsProps) => recipeGuiFormFieldHelperText(props),
    errorText: (props: GuiFormFieldErrorTextVariantsProps) => recipeGuiFormFieldErrorText(props),
    input: (props: GuiUserInputVariantsProps) => recipeGuiUserInput(props),
    select: (props: GuiNativeSelectVariantsProps) => recipeGuiNativeSelect(props),
    textarea: (props: GuiUserInputVariantsProps) => recipeGuiUserInput(props),
};

export type GuiFormFieldVariantsProps = 
  VariantProps<typeof recipeGuiFormField.parent> & 
  VariantProps<typeof recipeGuiFormField.label> & 
  VariantProps<typeof recipeGuiUserInput> & 
  VariantProps<typeof recipeGuiNativeSelect> & 
  VariantProps<typeof recipeGuiFormField.helperText>;