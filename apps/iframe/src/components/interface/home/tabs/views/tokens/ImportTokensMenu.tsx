import { Menu } from "@ark-ui/react"
import { Plus, X } from "@phosphor-icons/react"
import { cx } from "class-variance-authority"
import { useAtom } from "jotai"
import { useCallback } from "react"
import { useWatchAsset } from "wagmi"
import { Button } from "#src/components/primitives/button/Button"
import { recipeContent, recipePositioner } from "#src/components/primitives/popover/variants"
import { importTokensMenuVisibilityAtom } from "./state"

const TriggerImportTokensMenu = () => {
    const [isVisible, setVisibility] = useAtom(importTokensMenuVisibilityAtom)

    return (
        <button
            type="button"
            className="flex flex-row items-center justify-center gap-2 hover:text-blue-600 hover:underline"
            onClick={() => {
                setVisibility(!isVisible)
            }}
        >
            <Plus size="1em" />
            <span>Import Token</span>
        </button>
    )
}

const ImportTokensMenu = () => {
    const [isImportTokensMenuVisible, setIsImportTokensMenuVisible] = useAtom(importTokensMenuVisibilityAtom)

    const { watchAsset } = useWatchAsset()

    const watch = useCallback(() => {
        watchAsset({
            type: "ERC20",
            options: {
                address: "0xe7b1987CE19C0824D03b8bcc5919DB9604096376",
                symbol: "MTB",
                decimals: 18,
            },
        })
        setIsImportTokensMenuVisible(false)
    }, [watchAsset, setIsImportTokensMenuVisible])

    return (
        <Menu.Root
            open={isImportTokensMenuVisible}
            onInteractOutside={() => {
                setIsImportTokensMenuVisible(false)
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
                    <div className="overflow-y-auto flex flex-col p-4">
                        <Menu.ItemGroup className="flex-col">
                            <Menu.ItemGroupLabel className="text-center font-semibold mb-2 flex justify-between items-center">
                                Import Token
                                <button
                                    type="button"
                                    onClick={() => setIsImportTokensMenuVisible(false)}
                                    className="hover:opacity-70"
                                >
                                    <X size="1.2em" />
                                </button>
                            </Menu.ItemGroupLabel>
                            <div className="flex flex-col gap-2">
                                <Menu.Item value="address" className="flex flex-col gap-1">
                                    <p>Address</p>
                                    <input
                                        type="text"
                                        className="input input-bordered input-sm w-full"
                                        placeholder="0xe7b1987CE19C0824D03b8bcc5919DB9604096376"
                                    />
                                </Menu.Item>
                                <Menu.Separator />
                                <Menu.Item value="address" className="flex flex-col gap-1">
                                    <p>Symbol</p>
                                    <input
                                        type="text"
                                        className="input input-bordered input-sm w-full"
                                        placeholder="MTB"
                                    />
                                </Menu.Item>
                                <Menu.Separator />
                                <Menu.Item value="address" className="flex flex-col gap-1">
                                    <p>Decimals</p>
                                    <input
                                        type="text"
                                        className="input input-bordered input-sm w-full"
                                        placeholder="18"
                                    />
                                </Menu.Item>
                                <Menu.Separator />
                                <Button className="justify-center" onClick={watch}>
                                    Add
                                </Button>
                            </div>
                        </Menu.ItemGroup>
                    </div>
                </Menu.Content>
            </div>
        </Menu.Root>
    )
}

export { ImportTokensMenu, TriggerImportTokensMenu }
