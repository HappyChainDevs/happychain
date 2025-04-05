import { Switch as ArkSwitch } from "@ark-ui/react/switch"
import { GuiContainer, GuiControl, GuiThumb } from "./gui"

/**
 * A control element that allows the user to select a binary value (on/off, true/false, checked/unchecked)
 * @see {@link https://ark-ui.com/react/docs/components/switch} API Reference
 *
 */

/**
 * A control element that allows the user to select a binary value.
 *
 * @see {@link https://ark-ui.com/react/docs/components/switch} API Reference
 *
 * @example - basic toggle switch
 * ```tsx
 * import { Switch } from '@happy.tech/uikit-react';
 * import { useState } from 'react';
 *
 * const [checked, setChecked] = useState(false);
 * const BasicSwitch = () => (
 *   <Switch.Gui.Root
 *      checked={checked}
 *      onCheckedChange={({ checked }) => setChecked(checked)}
 *   >
 *     <Switch.Gui.Control>
 *       <Switch.Gui.Thumb />
 *     </Switch.Gui.Control>
 *     <Switch.HiddenInput />
 *     <Switch.Gui.Label>Allow notifications</Switch.Gui.Label>
 *   </Switch.Gui.Root>
 * );
 * ```
 */
const Switch = Object.assign({
    ...ArkSwitch,
    Gui: {
        ...ArkSwitch,
        Root: GuiContainer,
        Control: GuiControl,
        Thumb: GuiThumb,
    },
})

Switch.displayName = "Switch"

export { Switch }
