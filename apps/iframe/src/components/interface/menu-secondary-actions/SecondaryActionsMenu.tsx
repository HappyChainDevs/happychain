import { Menu } from "@ark-ui/react/menu"
import { ArrowLeftIcon, CaretRightIcon, GearSixIcon, QueueIcon, SignOutIcon } from "@phosphor-icons/react"
import { Link, useRouter } from "@tanstack/react-router"
import { cx } from "class-variance-authority"
import { useAtom } from "jotai"
import { recipeContent, recipePositioner } from "#src/components/primitives/popover/variants"
import { dialogLogOutConfirmationVisibilityAtom, secondaryMenuVisibilityAtom } from "#src/state/interfaceState"

const TriggerSecondaryActionsMenu = () => {
    const [isVisible, setVisibility] = useAtom(secondaryMenuVisibilityAtom)
    const router = useRouter()

    const handleAction = (e: React.PointerEvent<HTMLButtonElement>) => {
        // Otherwise a click on the icon when the menu is open causes it to immediately re-open.
        // The menu will close if clicking anywhere outside it, including on this icon.
        if (isVisible) return
        e.stopPropagation()
        e.preventDefault()

        const isOnHome = router.state.location.pathname === "/embed"
        if (!isOnHome) {
            // Navigate to embed if not already there
            router.navigate({ to: "/embed" })
        } else {
            // Only toggle visibility if already on embed
            setVisibility((prev) => !prev)
        }
    }

    return (
        <button
            className="rounded-full p-0.5 aspect-square bg-neutral/5 focus-within:bg-neutral/10 dark:bg-neutral/50 dark:focus-within:bg-neutral/60"
            type="button"
            title={isVisible ? "Close this menu" : "Open this menu"}
            aria-label={isVisible ? "Close secondary actions menu" : "Open secondary actions menu"}
            onClick={handleAction}
        >
            <GearSixIcon size="1em" weight={isVisible ? "fill" : "regular"} />
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
                            "motion-safe:data-[state=open]:animate-growIn motion-safe:data-[state=closed]:animate-growOut",
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
                    <div className="overflow-y-auto flex flex-col px-2">
                        <Menu.Item asChild value={MenuActions.Permissions}>
                            <Link preload="intent" to="/embed/permissions">
                                <span className="w-full max-w-prose mx-auto justify-between items-center inline-flex">
                                    <span className="flex items-center gap-2">
                                        <QueueIcon size="1em" />
                                        <span>Permissions</span>
                                    </span>
                                    <CaretRightIcon size="1em" />
                                </span>
                            </Link>
                        </Menu.Item>
                        <Menu.Item value={MenuActions.LogOut}>
                            <span className="w-full max-w-prose mx-auto inline-flex items-center gap-2">
                                <SignOutIcon size="1em" />
                                <span>Logout</span>
                            </span>
                        </Menu.Item>
                        <Menu.Item value={MenuActions.Back}>
                            <span className="w-full max-w-prose mx-auto inline-flex items-center gap-2">
                                <ArrowLeftIcon size="1em" />
                                <span>Go back</span>
                            </span>
                        </Menu.Item>
                    </div>
                </Menu.Content>
            </div>
        </Menu.Root>
    )
}

export { SecondaryActionsMenu, TriggerSecondaryActionsMenu }
