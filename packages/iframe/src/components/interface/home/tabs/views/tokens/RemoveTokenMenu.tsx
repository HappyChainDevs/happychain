import { Menu } from "@ark-ui/react/menu"
// import { DotsThreeVertical } from "@phosphor-icons/react"
import { cx } from "class-variance-authority"
// import { useAtom } from "jotai"
import type { Address } from "viem"
// import { removeTokensMenuVisibilityAtom } from "#src/components/interface/menu-secondary-actions/state"
import { recipeContent, recipePositioner } from "#src/components/primitives/popover/variants.js"

// enum TokenMenuActions {
//     Remove = "remove",
// }

interface RemoveTokensMenuProps {
    tokenAddress: Address
    userAddress: Address
}

// may not use this

// const TriggerRemoveTokensMenu = () => {
//     const [isVisible, setVisibility] = useAtom(removeTokensMenuVisibilityAtom)
//     return (
//         <button
//             type="button"
//             title={isVisible ? "Close this menu" : "Open this menu"}
//             aria-label={isVisible ? "Close secondary actions menu" : "Open secondary actions menu"}
//             onClick={() => {
//                 setVisibility(!isVisible)
//             }}
//         >
//             {!isVisible ? <DotsThreeVertical size="1.25em" /> : undefined}
//         </button>
//     )
// }

const RemoveTokenMenu = ({ tokenAddress, userAddress }: RemoveTokensMenuProps) => {
    // const [isTokenMenuVisible, setTokenMenuVisibility] = useAtom(removeTokensMenuVisibilityAtom)

    // function to remove watched asset

    console.log({ tokenAddress, userAddress })

    return (
        <Menu.Root>
            <Menu.Trigger>
                Open menu <Menu.Indicator>➡️</Menu.Indicator>
            </Menu.Trigger>
            <Menu.Positioner className={cx(["z-99"], recipePositioner({ mode: "default", originY: "default" }))}>
                <Menu.Content
                    className={cx(
                        recipeContent({
                            scale: "default",
                            intent: "default",
                            animation: "default",
                        }),
                    )}
                >
                    <div className="z-99 overflow-y-auto flex flex-col">
                        <Menu.Item className="text-white" value="react">
                            React
                        </Menu.Item>
                        <Menu.Item value="solid">Solid</Menu.Item>
                        <Menu.Item value="vue">Vue</Menu.Item>
                    </div>
                </Menu.Content>
            </Menu.Positioner>
        </Menu.Root>
    )
}

export { RemoveTokenMenu }
