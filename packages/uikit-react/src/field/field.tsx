import { Field as ArkField } from "@ark-ui/react/field"
import { GuiContainer, GuiErrorText, GuiHelperText, GuiInput, GuiLabel, GuiSelect, GuiTextarea } from "./gui"

const Root = ArkField.Root

/**
 * A composable component that provides form indications messages and controls.
 * @see {@link https://ark-ui.com/react/docs/components/field} API Reference
 *
 * @example - Basic input field
 * import { Field } from '@happy.tech/uikit-react';
 *
 * const FormFieldUserEmail = () => {
 *   return (
 *     <Field.Gui.Root required>
 *       <Field.Gui.Label>Your e-mail</Field.Gui.Label>
 *       <Field.Gui.Input placeholder="example@mail.com" type="email" />
 *       <Field.Gui.HelperText>The e-mail address that will receive notifications</Field.Gui.HelperText>
 *       <Field.Gui.ErrorText>Ensure you enter a valid e-mail address</Field.Gui.ErrorText>
 *     </Field.Gui.Root>
 *   );
 * }
 */
const Field = Object.assign(Root, {
    Gui: {
        Root: GuiContainer,
        Input: GuiInput,
        Textarea: GuiTextarea,
        Select: GuiSelect,
        Label: GuiLabel,
        ErrorText: GuiErrorText,
        HelperText: GuiHelperText,
    },
    ...ArkField,
})

export { Field }
