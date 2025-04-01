import { type HTMLArkProps, ark } from "@ark-ui/react"
import { Button, type GuiButtonProps } from "@happy.tech/uikit-react"
import { Link, useLocation, useMatch } from "@tanstack/react-router"
import { cx } from "cva"
import { useAtomValue } from "jotai"
import { type HTMLAttributes, type PropsWithChildren, forwardRef } from "react"
import { userAtom } from "#src/state/user"
import { PATHNAME_ROUTE_GAMES } from "#src/v2/screens/games/Games"
import { PATHNAME_ROUTE_HISTORY } from "#src/v2/screens/history/History"
import { BottomNavbarPermissions, PATHNAME_DAPPS_WITH_PERMISSIONS } from "#src/v2/screens/permissions/Permissions"
import {
    BottomNavbarAppPermissions,
    PATHNAME_DAPP_PERMISSIONS,
} from "#src/v2/screens/permissions/[$dappId]/AppPermissions"
import { BottomNavbarSendToken, PATHNAME_ROUTE_SEND_TOKEN } from "#src/v2/screens/send/Send"
import { PATHNAME_ROUTE_TOKENS } from "#src/v2/screens/tokens/Tokens"
import { BottomNavbarTokenHistory, PATHNAME_ROUTE_TOKEN_HISTORY } from "#src/v2/screens/tokens/history/TokenHistory"
import { RootDialogsIsland } from "./dialogs"
import { UserDetails } from "./user"

/**
 * The display area and simulated screen reflection effect.
 *
 */
const RootScreen = ({ children }: PropsWithChildren) => {
    return (
        <div data-scope="device" data-part="screen" className="relative">
            <main
                data-scope="screen"
                data-part="display"
                className={`
                    relative rounded-hds-xs h-[360px] w-full
                    border
                    overflow-hidden
                    flex flex-col
                    font-hds-system-gui-display
                    text-hds-system-gui-foreground-default
                    text-hds-system-gui-base
                    tracking-hds-loose
                    bg-hds-system-skeuo-surface-default
                    px-3 pt-3
                `}
            >
                {children}
            </main>
            <div
                data-scope="screen"
                data-part="reflection"
                aria-hidden="true"
                className={`
                    pointer-events-none
                    absolute inset-0 size-full
                    before:sticky before:block before:inset-0 before:size-full before:rounded-inherit 
                    before:bg-gradient-hds-utility-tint-30-transparent
                    before:pointer-events-none
                    before:z-1
                `}
            />
        </div>
    )
}

/**
 * A fixed-sized, no-overflow container that provides a structured way to organize content within a `<Screen />`.
 */
const RootView = ({ className = "", children, ...props }: HTMLAttributes<HTMLDivElement>) => {
    return (
        <div
            data-scope="display"
            data-part="view"
            className={cx("relative group grid h-full grid-rows-[auto_1fr_auto]", className)}
            {...props}
        >
            {children}
        </div>
    )
}

/**
 * Creates a scrollable region within a `<View />`.
 */
export const Scrollable = forwardRef<HTMLDivElement, HTMLArkProps<"div">>(
    ({ className = "", children, asChild, ...props }, ref) => {
        return (
            <ark.div
                className={cx("grid overflow-auto min-h-0 pb-2", className)}
                asChild={asChild}
                ref={ref}
                data-scope="view"
                data-part="scrollable"
                {...props}
            >
                {children}
            </ark.div>
        )
    },
)

const NavbarItem = forwardRef<HTMLButtonElement, GuiButtonProps>(
    ({ className = "", children, asChild, ...props }, ref) => {
        return (
            <Button.Gui
                ref={ref}
                data-scope="navbar"
                data-part="item"
                className={`
                    pt-0.5 
                    uppercase data-[scope=navbar]:tracking-normal
                    first:justify-start first:ps-0 last:not-only:pe-0 
                    last:not-only:justify-end 
                    justify-center
                `}
                asChild={asChild}
                {...props}
            >
                {children}
            </Button.Gui>
        )
    },
)

const RootNavbar = forwardRef<HTMLDivElement, HTMLArkProps<"div">>(
    ({ className = "", children, asChild, ...props }, ref) => {
        return (
            <div
                data-scope="view"
                data-part="footer"
                className={cx(
                    "w-full pt-2 sticky mt-auto bottom-0 start-0 bg-hds-system-skeuo-surface-default",
                    className,
                )}
            >
                <div
                    data-scope="footer"
                    data-part="navbar"
                    className="px-1.25 border-t border-hds-system-skeuo-foreground-default/50 "
                >
                    <ark.div
                        ref={ref}
                        data-scope="navbar"
                        data-part="root"
                        className="grid gap-2 grid-cols-3"
                        asChild={asChild}
                        {...props}
                    >
                        {children}
                    </ark.div>
                </div>
            </div>
        )
    },
)

export const BottomNavbar = Object.assign(RootNavbar, {
    Item: NavbarItem,
})

const PROTECTED_PATHNAMES: Array<string> = []

/**
 * Dynamically renders the appropriate navbar based on the current route and user state.
 *
 * @example - Go back navbar
 * ```tsx
 *  <BottomNavbar asChild>
 *     <nav>
 *       <BottomNavbar.Item asChild>
 *           <Link to="/" className="gap-2">
 *               <span
 *                   aria-hidden="true"
 *                   className="h-3.5 block aspect-square mask-icon-hds-system-gui-arrow-left bg-current"
 *               />
 *               <span>Back</span>
 *           </Link>
 *       </BottomNavbar.Item>
 *     </nav>
 *  </BottomNavbar>
 * ```
 */
const RootBottomNavbarIsland = () => {
    const { pathname } = useLocation()
    const matchTokenHistory = useMatch({ from: PATHNAME_ROUTE_TOKEN_HISTORY, shouldThrow: false })
    const user = useAtomValue(userAtom)
    const matchPermissions = useMatch({ from: PATHNAME_DAPPS_WITH_PERMISSIONS, shouldThrow: false })
    const matchAppPermissions = useMatch({ from: PATHNAME_DAPP_PERMISSIONS, shouldThrow: false })

    // Prevents rendering the navbar if user isn't connected
    if (PROTECTED_PATHNAMES.includes(pathname) || !user) return null
    if (pathname === PATHNAME_ROUTE_SEND_TOKEN) return <BottomNavbarSendToken />
    if (matchTokenHistory) return <BottomNavbarTokenHistory />
    if (matchPermissions) return <BottomNavbarPermissions />
    if (matchAppPermissions) return <BottomNavbarAppPermissions />
    // @todo - ... render conditionally any other navbar here ..

    // Default navbar
    return (
        <BottomNavbar asChild>
            <nav>
                {[
                    {
                        label: "Tokens",
                        pathname: PATHNAME_ROUTE_TOKENS,
                    },
                    {
                        label: "Games",
                        pathname: PATHNAME_ROUTE_GAMES,
                    },
                    {
                        label: "History",
                        pathname: PATHNAME_ROUTE_HISTORY,
                    },
                ].map((item) => (
                    <BottomNavbar.Item asChild key={`island-bottomnav-${item.pathname}`}>
                        <Link to={item.pathname}>{item.label}</Link>
                    </BottomNavbar.Item>
                ))}
            </nav>
        </BottomNavbar>
    )
}

const RootHeader = ({ children }: PropsWithChildren) => {
    return (
        <div data-scope="view" data-part="header" className="size-full pb-2">
            {children}
        </div>
    )
}
const RootHeaderIsland = () => {
    const matchPermissions = useMatch({ from: PATHNAME_DAPPS_WITH_PERMISSIONS, shouldThrow: false })
    const matchAppPermissions = useMatch({ from: PATHNAME_DAPP_PERMISSIONS, shouldThrow: false })

    if (matchPermissions || matchAppPermissions) return null
    return (
        <RootHeader>
            <UserDetails />
        </RootHeader>
    )
}
/**
 * A specific content layout structure within a `<Screen />`
 * Handles organization of GUI elements. Its content changes based on user actions, but are always
 * displayed within the same Screen.
 *
 * @example
 * ```tsx
 *   <Screen.View>
 *     <header>Fixed header</header>
 *     <Screen.View.Scrollable>
 *       Scrollable content here
 *     </Screen.View.Scrollable>
 *     <p>Another fixed paragraph.</p>
 *     <Screen.View.BottomNavbarIsland />
 *     <Screen.View.DialogsIsland />
 *   </Screen.View>
 * ```
 */
export const View = Object.assign(RootView, {
    Scrollable,
    BottomNavbar,
    BottomNavbarIsland: RootBottomNavbarIsland,
    HeaderIsland: RootHeaderIsland,
    DialogsIsland: RootDialogsIsland,
})

/**
 * Creates the visual boundary between device shell and digital content.
 * Remains constant while different views (`<View />`) are displayed within it.
 *
 * @example
 * ```tsx
 * <Screen>
 *    <Screen.View>
 *      <div>
 *         This would look fixed
 *      </div>
 *      <Screen.View.Scrollable>
 *       <p>This will be scrollable</p>
 *      </Screen.View.Scrollable>
 *      <Screen.BottomNavbar>
 *         <Screen.BottomNavbar.Item>Hello</Screen.BottomNavbar.Item>
 *        <Screen.BottomNavbar.Item>World</Screen.BottomNavbar.Item>
 *      </Screen.BottomNavbar>
 *    </Screen.View>
 * </Screen>
 * ```
 */
export const Screen = Object.assign(RootScreen, {
    View,
})
