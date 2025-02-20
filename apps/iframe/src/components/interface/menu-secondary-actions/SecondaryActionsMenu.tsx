import { Menu } from "@ark-ui/react/menu"
import { CaretDown, CaretRight, CaretUp } from "@phosphor-icons/react"
import { Link } from "@tanstack/react-router"
import { cx } from "class-variance-authority"
import { useAtom } from "jotai"
import { recipeContent, recipePositioner } from "#src/components/primitives/popover/variants"
import { dialogLogOutConfirmationVisibilityAtom, secondaryMenuVisibilityAtom } from "./state"

const TriggerSecondaryActionsMenu = () => {
    const [isVisible, setVisibility] = useAtom(secondaryMenuVisibilityAtom)

    return (
        <button
            className="rounded-full p-0.5 aspect-square bg-neutral/5 focus-within:bg-neutral/10 dark:bg-neutral/50 dark:focus-within:bg-neutral/60"
            type="button"
            title={isVisible ? "Close this menu" : "Open this menu"}
            aria-label={isVisible ? "Close secondary actions menu" : "Open secondary actions menu"}
            onClick={() => {
                setVisibility(!isVisible)
            }}
        >
            {isVisible ? <CaretUp size="1.15em" /> : <CaretDown size="1.15em" />}
        </button>
    )
}

enum MenuActions {
    Permissions = "permissions",
    LogOut = "logout",
    Back = "back",
}

const SecondaryActionsMenu = () => {
    const [isSecondaryMenuVisible, setSecondaryMenuVisibility] = useAtom(secondaryMenuVisibilityAtom)
    const [, setDialogLogOutConfirmationVisibility] = useAtom(dialogLogOutConfirmationVisibilityAtom)

    return (
        <Menu.Root
            open={isSecondaryMenuVisible}
            onEscapeKeyDown={() => {
                setSecondaryMenuVisibility(false)
            }}
            onInteractOutside={() => {
                setSecondaryMenuVisibility(false)
            }}
            onSelect={(details: { value: string }) => {
                switch (details.value) {
                    case MenuActions.LogOut:
                        setDialogLogOutConfirmationVisibility(true)
                        break
                    default:
                        setSecondaryMenuVisibility(false)
                        break
                }
            }}
        >
            <div
                className={cx(
                    "top-0",
                    recipePositioner({
                        originY: "bottom",
                        mode: "modal",
                    }),
                )}
            >
                <Menu.Content
                    className={cx(
                        [
                            "lock-parent-scroll",
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
                            "[&_[data-part=item]:not([data-disabled])]:cursor-pointer [&_[data-part=item][data-disabled]]:cursor-not-allowed",
                            // Item (highlighted)
                            "[&_[data-part=item][data-highlighted]]:bg-base-200",
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
                                <span className="w-full max-w-prose mx-auto justify-between items-center inline-flex">
                                    <span>Permissions</span>
                                    <CaretRight size="1em" />
                                </span>
                            </Link>
                        </Menu.Item>
                        <Menu.Item value={MenuActions.LogOut}>
                            <span className="w-full max-w-prose mx-auto inline-flex">Logout</span>
                        </Menu.Item>
                        <Menu.Item value={MenuActions.Back}>
                            <span className="w-full max-w-prose mx-auto inline-flex">Go back</span>
                        </Menu.Item>
                    </div>
                </Menu.Content>
            </div>
        </Menu.Root>
    )
}

export { SecondaryActionsMenu, TriggerSecondaryActionsMenu }
