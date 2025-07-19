import { Menu } from "@ark-ui/react/menu"
import type { Address } from "@happy.tech/common"
import { DotsThreeVerticalIcon } from "@phosphor-icons/react"
import { recipeContent } from "#src/components/primitives/popover/variants"
import { removeWatchedAsset } from "#src/state/watchedAssets"

enum TokenMenuActions {
    StopTracking = "Stop tracking",
}

interface RemoveTokensMenuProps {
    token: Address
}

const RemoveTokenMenu = ({ token }: RemoveTokensMenuProps) => {
    return (
        <Menu.Root aria-label="Asset Options Menu" lazyMount={true} unmountOnExit={true}>
            <Menu.Trigger>
                <DotsThreeVerticalIcon className="opacity-80" size="1.5em" />
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
                        className="text-primary dark:text-content cursor-pointer bg-primary/20 hover:bg-primary/30 dark:bg-primary/10 dark:hover:bg-primary/20 rounded-md p-1.5"
                        value={TokenMenuActions.StopTracking}
                        onClick={() => removeWatchedAsset(token)}
                    >
                        <span className="text-primary/60">{TokenMenuActions.StopTracking}</span>
                    </Menu.Item>
                </Menu.Content>
            </Menu.Positioner>
        </Menu.Root>
    )
}

export { RemoveTokenMenu }
