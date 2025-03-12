import { Menu as ArkMenu } from "@ark-ui/react/menu"
import { GuiContent, GuiItem, GuiTrigger } from "./gui"

const Root = ArkMenu.Root

/**
 * A composable component that toggles the visibility of an overlayed panel to the user
 * when they interact with a button.
 * This panel displays a list of actions/options for the user to choose from.
 *
 * @see {@link https://ark-ui.com/react/docs/components/menu} API Reference
 *
 * @example
 * import { Menu } from '@happy.tech/uikit-react';
 *
 * const MyMenu = () => {
 *  return (
 *   <Menu.Root >
 *     <Menu.Gui.Trigger>
 *        Open menu
 *     </Menu.Gui.Trigger>
 *     <Menu.Positioner>
 *        <Menu.Gui.Content className="w-full">
 *          <Menu.Gui.Item value="option1">
 *              I'm option 1
 *              <span data-part="icon">+</span>
 *          </Menu.Gui.Item>
 *          <Menu.Gui.Item intent='negative' value="option2">
 *              I'm option 2
 *              <span data-part="icon">-</span>
 *          </Menu.Gui.Item>
 *          <Menu.Gui.Item value="option3">
 *              I'm option 3
 *          </Menu.Gui.Item>
 *       </Menu.Gui.Content>
 *     </Menu.Positioner>
 *   </Menu.Root>
 *  );
 * }
 *
 */
const Menu = Object.assign(Root, {
    Gui: {
        Content: GuiContent,
        Item: GuiItem,
        Trigger: GuiTrigger,
    },
    ...ArkMenu,
})

export { Menu }
