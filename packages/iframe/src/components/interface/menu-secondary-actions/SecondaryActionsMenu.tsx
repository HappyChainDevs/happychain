import { Menu } from "@ark-ui/react/menu"
import { CaretDown, CaretRight, CaretUp } from "@phosphor-icons/react"
import { Link } from "@tanstack/react-router"
import { cx } from "class-variance-authority"
import { useAtom } from "jotai"
import { recipeContent, recipePositioner } from "#src/components/primitives/popover/variants"
import { dialogSignOutConfirmationVisibilityAtom, secondaryMenuVisibilityAtom } from "./state"

const TriggerSecondaryActionsMenu = () => {
    const [isVisible, setVisibility] = useAtom(secondaryMenuVisibilityAtom)

    return (
        <button
            type="button"
            title={isVisible ? "Close this menu" : "Open this menu"}
            aria-label={isVisible ? "Close secondary actions menu" : "Open secondary actions menu"}
            onClick={() => {
                setVisibility(!isVisible)
            }}
        >
            {isVisible ? <CaretUp size="1.25em" /> : <CaretDown size="1.25em" />}
        </button>
    )
}

enum MenuActions {
    Permissions = "permissions",
    Disconnect = "disconnect",
}

const SecondaryActionsMenu = () => {
    const [isSecondaryMenuVisible, setSecondaryMenuVisibility] = useAtom(secondaryMenuVisibilityAtom)
    const [, setDialogSignOutConfirmationVisibility] = useAtom(dialogSignOutConfirmationVisibilityAtom)

    return (
        <Menu.Root
            open={isSecondaryMenuVisible}
            onInteractOutside={() => {
                setDialogSignOutConfirmationVisibility(false)
            }}
            onSelect={(details: { value: string }) => {
                switch (details.value) {
                    case MenuActions.Disconnect:
                        setDialogSignOutConfirmationVisibility(true)
                        break
                    default:
                        setSecondaryMenuVisibility(false)
                        break
                }
            }}
        >
            <div
                className={recipePositioner({
                    originY: "bottom",
                    mode: "modal",
                })}
            >
                <Menu.Content
                    className={cx(
                        [
                            // Animation
                            "motion-safe:data-[state=open]:animate-growIn",
                            "py-2 sm:pb-0",
                            // Item
                            "[&_[data-part=item]]:font-medium",
                            // Item: flex properties
                            "[&_[data-part=item]]:inline-flex [&_[data-part=item]]:items-center [&_[data-part=item]]:justify-between",
                            // Item: spacing, size
                            "[&_[data-part=item]]:min-h-10 [&_[data-part=item]]:p-2 [&_[data-part=item]]:gap-2",
                            // Item: cursor interactivity
                            "[&_[data-part=item]]:not([data-disabled])]:cursor-pointer &_[data-part=item][data-disabled]]:cursor-not-allowed",
                            // Item (highlighted)
                            " [&_[data-part=item][data-highlighted]]:bg-base-200",
                        ],
                        recipeContent({
                            scale: "default",
                            intent: "default",
                            animation: "default",
                        }),
                    )}
                >
                    <div className="overflow-y-auto flex flex-col">
                        <Menu.Item asChild value={MenuActions.Permissions}>
                            <Link preload="intent" to="/embed/permissions">
                                <span>Permissions</span>
                                <CaretRight size="1em" />
                            </Link>
                        </Menu.Item>
                        <Menu.Item value={MenuActions.Disconnect}>Disconnect</Menu.Item>
                    </div>
                </Menu.Content>
            </div>
        </Menu.Root>
    )
}

export { SecondaryActionsMenu, TriggerSecondaryActionsMenu }
