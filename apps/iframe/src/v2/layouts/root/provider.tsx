import { useRouterState } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { type PropsWithChildren, type SetStateAction, createContext, useContext, useState } from "react"
import { userAtom } from "#src/state/user"

// hook + provider
export enum LayoutState {
    Ready = "ready",
    Transitioning = "transitioning",
    Unready = "unready",
}

function useProviderValue() {
    const state = useRouterState()
    const user = useAtomValue(userAtom)

    // Slider state slices and handlers
    const [ticks] = useState([0, 50, 100])
    const [navSliderPosition, setNavSliderPosition] = useState([0])

    function handleNavValueChange(details: { value: SetStateAction<Array<number>> }) {
        setNavSliderPosition(details.value)
    }

    function handleNavValueChangeEnd(details: { value: Array<number> }) {
        const referencePosition = details.value[0]
        const newPosition = ticks.reduce((prevPosition, currPosition) => {
            return Math.abs(currPosition - referencePosition) < Math.abs(prevPosition - referencePosition)
                ? currPosition
                : prevPosition
        })
        setNavSliderPosition([newPosition])
    }

    return {
        routerState: state,
        layoutState: !user
            ? LayoutState.Unready
            : state.isLoading || state.isTransitioning
              ? LayoutState.Transitioning
              : LayoutState.Ready,
        navSliderPosition,
        handleNavValueChange,
        handleNavValueChangeEnd,
        navTicks: ticks,
    }
}

export type RootLayoutContextType = ReturnType<typeof useProviderValue>
const RootLayoutContext = createContext<RootLayoutContextType | undefined>(undefined)

export const RootLayoutProvider = (props: React.PropsWithChildren) => {
    const value = useProviderValue()
    return <RootLayoutContext.Provider value={value} {...props} />
}

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
