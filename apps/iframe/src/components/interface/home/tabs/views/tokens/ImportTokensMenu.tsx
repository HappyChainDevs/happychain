import { Field, Menu } from "@ark-ui/react"
import { Plus, X } from "@phosphor-icons/react"
import { cx } from "class-variance-authority"
import { useAtom, useAtomValue } from "jotai"
import { useCallback, useState } from "react"
import { type Address, isAddress } from "viem"
// import { useWatchAsset } from "wagmi"
import { Button } from "#src/components/primitives/button/Button"
import { recipeContent, recipePositioner } from "#src/components/primitives/popover/variants"
import { useERC20Balance } from "#src/hooks/useERC20Balance"
import { userAtom } from "#src/state/user"
import { importTokensMenuVisibilityAtom } from "./state"

/**
 * Trigger
 */
export const TriggerImportTokensMenu = () => {
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

/**
 * Menu
 */
export const ImportTokensMenu = () => {
    const [isImportTokensMenuVisible, setIsImportTokensMenuVisible] = useAtom(importTokensMenuVisibilityAtom)
    const user = useAtomValue(userAtom)
    // const { watchAsset } = useWatchAsset()

    const [inputAdd, setInputAdd] = useState("")
    const [validAddr, setValidAddr] = useState(false)

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target
        setInputAdd(value)
    }

    const {
        data: { symbol, decimals } = {},
    } = useERC20Balance(inputAdd as Address, user?.address as Address)

    const handleSubmitAddress = useCallback((e: React.FormEvent) => {
        e.preventDefault()
        // void watchAsset({
        //     type: "ERC20",
        //     options: {
        //         address: formData.address,
        //         symbol: formData.symbol,
        //         decimals: Number(formData.decimals),
        //     },
        // })
        setValidAddr(true)
        // setIsImportTokensMenuVisible(false)
    }, [])

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
                    <div className="flex flex-col p-4 overflow-y-auto grow">
                        <Menu.ItemGroup className="flex flex-col h-full justify-between gap-y-2">
                            <Menu.ItemGroupLabel className="flex text-center text-xl font-semibold justify-between items-center mb-2">
                                Import Tokens
                                <button
                                    type="button"
                                    onClick={() => setIsImportTokensMenuVisible(false)}
                                    className="hover:opacity-70"
                                >
                                    <X size="1.2em" />
                                </button>
                            </Menu.ItemGroupLabel>
                            <form onSubmit={handleSubmitAddress} className="flex flex-col gap-2">
                                <Field.Root className="flex flex-col gap-y-2">
                                    <Field.Label className="italic">Token Contract Address</Field.Label>
                                    <Field.Input
                                        className="h-10 bg-neutral-200 rounded-lg p-2"
                                        onChange={handleInputChange}
                                        value={inputAdd}
                                    />
                                    {!isAddress(inputAdd) && (
                                        <Field.ErrorText className="text-error">Invalid Address</Field.ErrorText>
                                    )}
                                </Field.Root>

                                {validAddr && (
                                    <>
                                        {/* token decimals */}
                                        <Field.Root className="flex flex-col gap-y-2">
                                            <Field.Label className="italic">Token Symbol</Field.Label>
                                            <Field.Input
                                                className="h-10 bg-neutral-200 rounded-lg p-2"
                                                onChange={handleInputChange}
                                                value={symbol ?? symbol}
                                            />
                                            {!isAddress(inputAdd) && (
                                                <Field.ErrorText className="text-error">
                                                    {!symbol &&
                                                        "No data returned for symbol; potentially incorrect contract."}
                                                </Field.ErrorText>
                                            )}
                                        </Field.Root>
                                        <Field.Root className="flex flex-col gap-y-2">
                                            <Field.Label className="italic">Token Decimals</Field.Label>
                                            <Field.Input
                                                className="h-10 bg-neutral-200 rounded-lg p-2"
                                                onChange={handleInputChange}
                                                value={decimals ?? decimals}
                                            />
                                            {!isAddress(inputAdd) && (
                                                <Field.ErrorText className="text-error">
                                                    {!decimals &&
                                                        "No data returned for decimals; potentially incorrect contract."}
                                                </Field.ErrorText>
                                            )}
                                        </Field.Root>
                                    </>
                                )}
                            </form>
                            <Button type="submit" className="justify-center" onClick={handleSubmitAddress}>
                                {validAddr ? "Import" : "Submit"}
                            </Button>
                        </Menu.ItemGroup>
                    </div>
                </Menu.Content>
            </div>
        </Menu.Root>
    )
}
