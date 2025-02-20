import { Menu } from "@ark-ui/react/menu"
import { DotsThreeVertical } from "@phosphor-icons/react"
import type { Address } from "viem"
import { recipeContent } from "#src/components/primitives/popover/variants"
import { removeWatchedAsset } from "#src/state/watchedAssets"

enum TokenMenuActions {
    StopTracking = "Stop tracking",
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
        <Menu.Root aria-label="Asset Options Menu" lazyMount={true} unmountOnExit={true}>
            <Menu.Trigger>
                <DotsThreeVertical className="opacity-80" size="1.5em" />
            </Menu.Trigger>
            <Menu.Positioner className="[--z-index:1!important]">
                <Menu.Content
                    className={recipeContent({
                        animation: "default",
                        intent: "default",
                        scale: "default",
                    })}
                >
                    <Menu.Item
                        asChild
                        className="text-white cursor-pointer p-2 bg-base-content/20 rounded-lg"
                        value={TokenMenuActions.StopTracking}
                        onClick={handleRemoveClick}
                    >
                        <span className="text-primary/60">{TokenMenuActions.StopTracking}</span>
                    </Menu.Item>
                </Menu.Content>
            </Menu.Positioner>
        </Menu.Root>
    )
}

export { RemoveTokenMenu }
