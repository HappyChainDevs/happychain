import { Collapsible as ArkCollapsible } from '@ark-ui/react/collapsible'
import { GuiContainer, GuiTrigger, GuiContent } from './gui';

/**
 * A composable component the user can expand/reduce to reveal/hide content inline.
 * @see {@link https://ark-ui.com/react/docs/components/collapsible} API Reference
 *
 * @example Basic collapsible section
 * import { Collapsible } from '@happy.tech/uikit-react';
 * 
 * const HideAndSeek = () => {
 *   return (
 *     <Collapsible defaultOpen={false}>
 *       <Collapsible.Gui.Trigger>
 *         Toggle me open/close !
 *       </Collapsible.Gui.Trigger>
 *       <Collapsible.Gui.Content>
 *         Wow, suddenly I'm visible !
 *       </Collapsible.Gui.Content>
 *     </Collapsible>
 *   );
 * }
 */

const Collapsible = Object.assign({
  Gui: {
    Root: GuiContainer,
    Content: GuiContent,
    Trigger: GuiTrigger,
  },
  ...ArkCollapsible,
});

export { Collapsible };