import { Menu } from "@ark-ui/react/menu"
import { DotsThreeVertical } from "@phosphor-icons/react"
import type { Address } from "viem"
import { recipeContent } from "#src/components/primitives/popover/variants.js"
import { removeWatchedAsset } from "#src/state/watchedAssets.js"

enum TokenMenuActions {
    Remove = "remove",
}

interface RemoveTokensMenuProps {
    tokenAddress: Address
    userAddress: Address
}

const RemoveTokenMenu = ({ tokenAddress, userAddress }: RemoveTokensMenuProps) => {
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
                        className="text-white cursor-pointer p-1 bg-base-content/80 rounded-lg"
                        value={TokenMenuActions.Remove}
                        onClick={handleRemoveClick}
                    >
                        <span>{TokenMenuActions.Remove}</span>
                    </Menu.Item>
                </Menu.Content>
            </Menu.Positioner>
        </Menu.Root>
    )
}

export { RemoveTokenMenu }
