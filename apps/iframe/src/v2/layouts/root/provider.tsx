import { type RouterEvents, useRouter, useRouterState } from "@tanstack/react-router"
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

/**
 * Internal hook.
 * Centralizes and manages all state and logic for the root layout.
 */
function useProviderValue() {
    const router = useRouter()
    const state = useRouterState()
    const user = useAtomValue(userAtom)
    const [isConfirmLogoutDialogVisible, setConfirmLogOutDialogVisibility] = useAtom(dialogConfirmLogOutVisibility)
    const [, setUserDetailsCollapseVisibility] = useAtom(userDetailsCollapsibleVisibility)

    // Slider state slices and handlers
    const [ticks] = useState([0, 50, 100]) // the visible "ticks" on the device UI
    const [navSliderPosition, setNavSliderPosition] = useState([0])

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
        const newPosition = ticks.reduce((prevPosition, currPosition) => {
            return Math.abs(currPosition - referencePosition) < Math.abs(prevPosition - referencePosition)
                ? currPosition
                : prevPosition
        })
        setNavSliderPosition([newPosition])
    }

    function handleOnRouterResolvedEvent(_e: RouterEvents["onResolved"]) {
        setUserDetailsCollapseVisibility(false)
        setConfirmLogOutDialogVisibility(false)
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
