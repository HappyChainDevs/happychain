import { Menu } from "@ark-ui/react/menu"
import { DotsThreeVertical } from "@phosphor-icons/react"
import type { Address } from "viem"
import { recipeContent } from "#src/components/primitives/popover/variants"
import { removeWatchedAsset } from "#src/state/watchedAssets"

enum TokenMenuActions {
    Remove = "remove",
}

interface RemoveTokensMenuProps {
    tokenAddress: Address
    userAddress: Address
}

const RemoveTokenMenu = ({ tokenAddress, userAddress }: RemoveTokensMenuProps) => {
    // un-watches the asset
    const handleRemoveClick = () => {
        removeWatchedAsset(tokenAddress, userAddress)
    }

    return (
        <Menu.Root aria-label="Asset Options Menu">
            <Menu.Trigger>
                <DotsThreeVertical size="1.5em" />
            </Menu.Trigger>
            <Menu.Positioner>
                <Menu.Content
                    className={recipeContent({
                        animation: "default",
                        intent: "default",
                        scale: "default",
                    })}
                >
                    <Menu.Item
                        asChild
                        className="text-white cursor-pointer p-1 bg-base-content/20 rounded-lg"
                        value={TokenMenuActions.Remove}
                        onClick={handleRemoveClick}
                    >
                        <span className="text-primary/60">{TokenMenuActions.Remove}</span>
                    </Menu.Item>
                </Menu.Content>
            </Menu.Positioner>
        </Menu.Root>
    )
}

export { RemoveTokenMenu }
