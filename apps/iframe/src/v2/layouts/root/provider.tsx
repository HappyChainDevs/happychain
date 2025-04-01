import {
    type RouterEvents,
    useCanGoBack,
    useMatch,
    useNavigate,
    useRouter,
    useRouterState,
} from "@tanstack/react-router"
import { useAtom, useAtomValue } from "jotai"
import {
    type PropsWithChildren,
    type SetStateAction,
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react"
import { userAtom } from "#src/state/user"
import { PATHNAME_ROUTE_GAMES } from "#src/v2/screens/games/Games"
import { PATHNAME_ROUTE_HISTORY } from "#src/v2/screens/history/History"
import { PATHNAME_ROUTE_SEND_TOKEN } from "#src/v2/screens/send/Send"
import { PATHNAME_ROUTE_TOKENS } from "#src/v2/screens/tokens/Tokens"
import { PATHNAME_ROUTE_TOKEN_HISTORY } from "#src/v2/screens/tokens/history/TokenHistory"
import { dialogConfirmLogOutVisibility, userDetailsCollapsibleVisibility } from "./user"

/**
 * The possible states of the wallet layout.
 * @description Used to coordinate UI transitions and loading states across components.
 */
export enum LayoutState {
    Ready = "ready",
    Transitioning = "transitioning",
    Unready = "unready",
}

const SCREEN_VALUES = {
    Tokens: 0,
    Games: 50,
    History: 100,
}

/**
 * Internal hook.
 * Centralizes and manages all state and logic for the root layout.
 */
function useProviderValue() {
    // Router
    const router = useRouter()
    const state = useRouterState()
    const canGoBack = useCanGoBack()
    const navigate = useNavigate()
    const matchTokensPage = useMatch({ from: PATHNAME_ROUTE_TOKENS, shouldThrow: false })
    const matchGamesPage = useMatch({ from: PATHNAME_ROUTE_GAMES, shouldThrow: false })
    const matchHistoryPage = useMatch({ from: PATHNAME_ROUTE_HISTORY, shouldThrow: false })
    const matchTokenHistoryPage = useMatch({ from: PATHNAME_ROUTE_TOKEN_HISTORY, shouldThrow: false })
    const matchSendToken = useMatch({ from: PATHNAME_ROUTE_SEND_TOKEN, shouldThrow: false })

    // User
    const user = useAtomValue(userAtom)

    // UI element
    const [isConfirmLogoutDialogVisible, setConfirmLogOutDialogVisibility] = useAtom(dialogConfirmLogOutVisibility)
    const [, setUserDetailsCollapseVisibility] = useAtom(userDetailsCollapsibleVisibility)

    // Slider state slices and handlers
    const [ticks] = useState(() => Object.values(SCREEN_VALUES)) // the visible "ticks" on the device UI
    const [navSliderPosition, setNavSliderPosition] = useState(() => {
        if (matchTokensPage) return [SCREEN_VALUES.Tokens]
        if (matchGamesPage) return [SCREEN_VALUES.Games]
        if (matchHistoryPage) return [SCREEN_VALUES.History]
        return [SCREEN_VALUES.Tokens]
    })

    /**
     * Updates the slider position during user interaction.
     */
    function handleNavValueChange(details: { value: SetStateAction<Array<number>> }) {
        setNavSliderPosition(details.value)
    }

    /**
     * Snaps the slider to the nearest tick when user interaction ends
     */
    function handleNavValueChangeEnd(details: { value: Array<number> }) {
        const referencePosition = details.value[0]
        const newPosition = findClosestTick(referencePosition, ticks)
        setNavSliderPosition([newPosition])

        if (matchSendToken || matchTokenHistoryPage) {
            if (newPosition === SCREEN_VALUES.Tokens) {
                canGoBack ? router.history.back() : navigate({ to: PATHNAME_ROUTE_TOKENS })
            }
            return
        }

        const tickPositionToRoute = {
            [SCREEN_VALUES.Tokens]: { match: matchTokensPage, route: PATHNAME_ROUTE_TOKENS },
            [SCREEN_VALUES.Games]: { match: matchGamesPage, route: PATHNAME_ROUTE_GAMES },
            [SCREEN_VALUES.History]: { match: matchHistoryPage, route: PATHNAME_ROUTE_HISTORY },
        }

        const screen = tickPositionToRoute[newPosition]
        if (screen && !screen.match) {
            navigate({ to: screen.route })
        }
    }

    function findClosestTick(reference: number, ticks: number[]): number {
        return ticks.reduce((prevPosition, currPosition) =>
            Math.abs(currPosition - reference) < Math.abs(prevPosition - reference) ? currPosition : prevPosition,
        )
    }

    function handleOnRouterResolvedEvent({ toLocation, fromLocation }: RouterEvents["onResolved"]) {
        setUserDetailsCollapseVisibility(false)
        setConfirmLogOutDialogVisibility(false)
        if (fromLocation) {
            switch (toLocation.pathname) {
                case PATHNAME_ROUTE_TOKENS:
                    setNavSliderPosition([SCREEN_VALUES.Tokens])
                    break

                case PATHNAME_ROUTE_GAMES:
                    setNavSliderPosition([SCREEN_VALUES.Games])
                    break

                case PATHNAME_ROUTE_HISTORY:
                    setNavSliderPosition([SCREEN_VALUES.History])
                    break
            }
        }
    }

    // biome-ignore lint/correctness/useExhaustiveDependencies: we just want to run this onMount
    useEffect(() => {
        const unsubscribe = router.subscribe("onResolved", handleOnRouterResolvedEvent)
        return unsubscribe
    }, [])

    const layoutState = useMemo(() => {
        if (!user) return LayoutState.Unready
        if (state.status === "pending" || isConfirmLogoutDialogVisible) return LayoutState.Transitioning
        return LayoutState.Ready
    }, [user, state.status, isConfirmLogoutDialogVisible])

    return {
        routerState: state,
        layoutState,
        navSliderPosition,
        handleNavValueChange,
        handleNavValueChangeEnd,
        navTicks: ticks,
    }
}

export type RootLayoutContextType = ReturnType<typeof useProviderValue>
const RootLayoutContext = createContext<RootLayoutContextType | undefined>(undefined)

/**
 * Provides root layout context to its children.
 * @example - Basic usage
 * ```tsx
 * <RootLayoutProvider>
 *   <App />
 * </RootLayoutProvider>
 * ```
 */
export const RootLayoutProvider = (props: PropsWithChildren) => {
    const value = useProviderValue()
    return <RootLayoutContext.Provider value={value} {...props} />
}

/**
 * Consumes root layout context, state slices and handlers from any component in the tree.
 *
 * @example - Basic usage
 * ```tsx
 * const NavSlider = () => {
 *   const { navSliderPosition, handleNavValueChange } = useRootLayout();
 *  return <Slider
 *     disabled={layoutState !== LayoutState.Ready}
 *     value={navSliderPosition}
 *     onValueChange={handleNavValueChange}
 *  />
 * }
 * ```
 */
export function useRootLayout() {
    const context = useContext(RootLayoutContext)
    if (context === undefined) {
        throw new Error("useRootLayout must be used within <RootLayoutProvider>")
    }
    return context
}

export const Root = ({ children }: PropsWithChildren) => {
    return <RootLayoutProvider>{children}</RootLayoutProvider>
}
