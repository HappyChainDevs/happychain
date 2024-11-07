import { Menu } from "@ark-ui/react"
import { Plus, X } from "@phosphor-icons/react"
import { cx } from "class-variance-authority"
import { useAtom } from "jotai"
import { useCallback, useState } from "react"
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
            <span>Import Tokens</span>
        </button>
    )
}

const ImportTokensMenu = () => {
    const [isImportTokensMenuVisible, setIsImportTokensMenuVisible] = useAtom(importTokensMenuVisibilityAtom)
    const { watchAsset } = useWatchAsset()

    const [formData, setFormData] = useState({
        address: "",
        symbol: "",
        decimals: "",
    })

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault()
            void watchAsset({
                type: "ERC20",
                options: {
                    address: formData.address,
                    symbol: formData.symbol,
                    decimals: Number(formData.decimals),
                },
            })
            setIsImportTokensMenuVisible(false)
        },
        [watchAsset, setIsImportTokensMenuVisible, formData],
    )

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
                            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
                                {["address", "symbol", "decimals"].map((field) => (
                                    <Menu.Item key={field} value={field} className="flex flex-col gap-1">
                                        <p>{field.charAt(0).toUpperCase() + field.slice(1)}</p>
                                        <input
                                            type="text"
                                            name={field}
                                            className="input input-bordered input-sm w-full"
                                            placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                                            value={formData[field as keyof typeof formData]}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </Menu.Item>
                                ))}
                                <Menu.Separator />
                                <Button type="submit" className="justify-center">
                                    Add
                                </Button>
                            </form>
                        </Menu.ItemGroup>
                    </div>
                </Menu.Content>
            </div>
        </Menu.Root>
    )
}

export { ImportTokensMenu, TriggerImportTokensMenu }
