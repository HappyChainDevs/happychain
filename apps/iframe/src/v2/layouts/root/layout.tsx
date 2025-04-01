import type { PropsWithChildren } from "react"
import { Device } from "./device"
import { Root } from "./provider"
import { Screen } from "./screen"

export const Layout = {
    Root,
    Device,
    Screen,
}

/**
 * Layout common to all pages.
 * Uses an "islands" architecture, where distinct interactive areas are visually and functionally 
 * separated from the main content.
 * 
 * We have 2 key islands in our layout :
 * 
 * 1. Device.ActionsIsland:
 *    - Located inside <Device /> but outside its <Screen /> 
 *    - Contains contextual actions that change based on current screen
 * 
 * 2. Screen.View.BottomNavbarIsland:
 *    - Represents software navigation within the digital interface
 *    - Located inside <Screen.View /> (part of the digital display)
 *    - Appears and behaves like a traditional mobile app navbar

 * @note Nesting order matters - Root (state) > Device (hardware) > Screen (display) > View (page/screen)
 * @note Children are rendered within `<Screen.View />`, not directly in Device or Screen
 * @note Page-specific controls should be handled by exporting custom components 
 *       that ActionsIsland and BottomNavbarIsland can render conditionally
 */
export const RootLayout = ({ children }: PropsWithChildren) => {
    return (
        <Layout.Root>
            <Layout.Device>
                <Layout.Screen>
                    <Layout.Screen.View
                        className={`
                            motion-safe:transition-[all_250ms]
                            [&:has([data-part=header])]:grid-rows-[1fr_12fr_1fr]
                            [&:has([data-part=header]_[data-state=open])]:grid-rows-[12fr_0_1fr]
                    `}
                    >
                        <Layout.Screen.View.HeaderIsland />
                        {children}
                        <Layout.Screen.View.BottomNavbarIsland />
                        <Layout.Screen.View.DialogsIsland />
                    </Layout.Screen.View>
                </Layout.Screen>
                <Layout.Device.NavSlider />
                <Layout.Device.ActionsIsland />
            </Layout.Device>
        </Layout.Root>
    )
}
