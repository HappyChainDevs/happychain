import { Combobox as ArkCombobox, createListCollection } from "@ark-ui/react/combobox"
import {
    GuiClearTrigger,
    GuiContainer,
    GuiContent,
    GuiControl,
    GuiInput,
    GuiItem,
    GuiItemGroup,
    GuiItemGroupLabel,
    GuiItemIndicator,
    GuiItemText,
    GuiLabel,
    GuiPositioner,
    GuiTrigger,
} from "./gui"

/**
 * A composable dropdown component that combines an input and a datalist.
 * @see {@link https://ark-ui.com/react/docs/components/combobox} API Reference
 * @see {@link https://ark-ui.com/react/docs/guides/collection} Guide on Ark Collections
 *
 * @example Basic combobox
 * ```tsx
 * import { Combobox, createListCollection } from '@happy.tech/uikit-react';
 * const [initialList] = useState([{ label: 'Apple', value: 'apple' }, { label: 'Banana', value: 'banana'}])
 * const [items, setItems] = useState(initialList)
 * const collection = useMemo(() => createListCollection({ items }), [items])
 * const handleInputChange = (details: Combobox.InputValueChangeDetails) => {
 *   setItems(initialItems.filter((item) => item.toLowerCase().includes(details.inputValue.toLowerCase())))
 * }
 *
 * //...
 *
 * <Combobox.Gui.Root
 *   onInputValueChange={yourFilteringFunction}
 *   collection={collection}
 * >
 *   <Combobox.Gui.Label>Fruits</Combobox.Gui.Label>
 *   <Combobox.Gui.Control>
 *     <Combobox.Gui.Input />
 *     <Combobox.Gui.Trigger>
 *       <span className="sr-only">Open list</span>
 *     </Combobox.Gui.Trigger>
 *   </Combobox.Gui.Control>
 *   <Combobox.Gui.Positioner>
 *     <Combobox.Gui.Content>
 *       {collection.items.map((item) => (
 *         <Combobox.Gui.Item
 *           key={item.value}
 *           item={item}
 *         >
 *           <Combobox.Gui.ItemText>
 *             {item.label}
 *           </Combobox.Gui.ItemText>
 *           <Combobox.Gui.ItemIndicator>
 *             ✓
 *           </Combobox.Gui.ItemIndicator>
 *         </Combobox.Gui.Item>
 *       ))}
 *     </Combobox.Gui.Content>
 *   </Combobox.Gui.Positioner>
 * </Combobox.Gui.Root>
 * ```
 */
const Combobox = Object.assign({
    ...ArkCombobox,
    Gui: {
        Root: GuiContainer,
        Content: GuiContent,
        Trigger: GuiTrigger,
        Positioner: GuiPositioner,
        Item: GuiItem,
        ItemGroup: GuiItemGroup,
        ItemGroupLabel: GuiItemGroupLabel,
        ItemIndicator: GuiItemIndicator,
        ItemText: GuiItemText,
        Label: GuiLabel,
        ClearTrigger: GuiClearTrigger,
        Control: GuiControl,
        Input: GuiInput,
    },
})

export { Combobox, createListCollection }
