import { Button, Slider } from "@happy.tech/uikit-react"
import { Link, useLocation } from "@tanstack/react-router"
import type { PropsWithChildren } from "react"
import { ActionsSendToken, PATHNAME_ROUTE_SEND_TOKEN } from "#src/v2/screens/send/Send"
import { LayoutState, useRootLayout } from "./provider"

/**
 * Controls bottom navigation in screens.
 * The slider uses predefined tick positions to ensure users land on valid, contextual screens.
 */
const NavSlider = () => {
    const { layoutState, navTicks, navSliderPosition, handleNavValueChange, handleNavValueChangeEnd } = useRootLayout()

    return (
        <div data-scope="device" data-part="slider" aria-hidden="true" className="px-3 py-5">
            <Slider.Skeuo.Root
                disabled={layoutState === LayoutState.Unready} // to prevent invalid navigation
                value={navSliderPosition}
                onValueChange={handleNavValueChange}
                onValueChangeEnd={handleNavValueChangeEnd}
                className="flex flex-col-reverse"
                {...(layoutState === LayoutState.Unready && { title: "You can't switch views now." })}
            >
                <Slider.Skeuo.Control>
                    <Slider.Skeuo.Track>
                        <Slider.Skeuo.Range />
                    </Slider.Skeuo.Track>
                    <Slider.Skeuo.Thumb index={0}>
                        <Slider.Skeuo.HiddenInput />
                    </Slider.Skeuo.Thumb>
                </Slider.Skeuo.Control>
                <Slider.Skeuo.MarkerGroup className="**:data-[part=marker]:before:h-5">
                    {navTicks.map((item) => (
                        <Slider.Skeuo.Marker key={`tick-${item}`} value={item} />
                    ))}
                </Slider.Skeuo.MarkerGroup>
            </Slider.Skeuo.Root>
        </div>
    )
}

interface GridActionsProps extends PropsWithChildren {
    cols?: 1 | 2
}
/**
 * A flexible, basic grid to control and organize contextual actions within an actions island
 */
const ContextualActionsGrid = ({ children, cols = 1 }: GridActionsProps) => {
    return (
        <div
            data-scope="actions"
            data-part="grid"
            className={`grid gap-y-2 gap-x-1.5 ${cols === 2 ? "grid-cols-2" : ""}`}
        >
            {children}
        </div>
    )
}

/**
 *
 * A set of contextual action buttons based on the current view/location.
 */
const ContextualActions = () => {
    const location = useLocation()

    // Based on the current pathname, we can render different actions
    // just export an <Actions /> component from your page/screen and render it here
    if (location.pathname === PATHNAME_ROUTE_SEND_TOKEN)
        return (
            <ContextualActionsGrid cols={1}>
                <ActionsSendToken />
            </ContextualActionsGrid>
        )
    // Default actions
    return (
        <ContextualActionsGrid cols={2}>
            {[
                { label: "Send", pathname: PATHNAME_ROUTE_SEND_TOKEN },
                { label: "Top up", pathname: "/" },
                { label: "Buy", pathname: "/" },
                { label: "Sell", pathname: "/" },
            ].map((action, i) => (
                <Button.Skeuo key={`${action.pathname}-${i}`}>
                    <Button.Skeuo.Label>{action.label}</Button.Skeuo.Label>
                    <Button.Skeuo.Trigger asChild>
                        <Link to={action.pathname}> {action.label}</Link>
                    </Button.Skeuo.Trigger>
                </Button.Skeuo>
            ))}
        </ContextualActionsGrid>
    )
}

/**
 * A dynamic "island" area that renders contextual action buttons.
 */
const ActionsIsland = () => {
    const { layoutState } = useRootLayout()

    return (
        <div
            data-scope="device"
            data-part="actions"
            className={`
                relative
                bg-gradient-hds-332deg-system-skeuo-surface-450-550
                p-0.25 rounded-t-hds-sm rounded-b-hds-lg
            `}
        >
            <div
                data-scope="actions"
                data-part="root"
                className={`
                    mt-auto rounded-[inherit]
                    grid gap-2 p-3 min-h-[114px]
                    overflow-hidden
                    shadow-[var(--shadow-hds-inwards-300),var(--shadow-hds-overflow-edge-bottom)]
                    relative before:absolute before:content-[' '] before:rounded-[inherit]
                    before:inset-0 before:block before:size-full
                    before:[background:var(--texture-hds-metal)]
                    before:pointer-events-none
                    before:mix-blend-multiply before:opacity-20
                    ${layoutState === LayoutState.Transitioning ? "cursor-wait" : ""}
                    ${layoutState === LayoutState.Unready ? "cursor-not-allowed" : ""}
                `}
            >
                <ContextualActions />
                <div
                    // This is purely decorative.
                    // Use animations to open/close.
                    // The animation is based on the `data-state` of the closest parent with class .group
                    aria-hidden="true"
                    data-scope="actions"
                    data-part="shutter"
                    className={`
                        rounded-[inherit]
                        drop-shadow-[0_25px_25px_var(--color-hds-utility-shade-50))]
                        motion-safe:transition-all
                        motion-safe:group-[[data-state=transitioning]]:animate-[shutter-close_450ms_ease-in-out_forwards]
                        motion-safe:group-[[data-state=ready]]:animate-[shutter-open_350ms_ease-in-out_forwards]
                        absolute size-full block z-1 inset-0
                        shadow-hds-bevel-inwards-advanced
                        bg-gradient-hds-154deg-system-skeuo-surface-850-700
                        before:absolute before:content-[' '] before:rounded-[inherit]
                        before:inset-0 before:block before:size-full
                        before:[background:var(--texture-hds-metal)]
                        before:mix-blend-multiply before:opacity-15
                        before:pointer-events-none
                        after:pointer-events-none
                        after:content-[' '] after:w-6 after:h-0.75 after:absolute after:rounded-hds-sm
                        after:bg-gradient-hds-system-skeuo-surface-500-425
                        after:bottom-2 after:start-1/2 after:-translate-x-1/2
                        after:shadow-[var(--shadow-hds-overflow-edge-top),var(--shadow-hds-inwards-200)]
                    `}
                />
            </div>
        </div>
    )
}

const RootDevice = ({ children }: PropsWithChildren) => {
    const { layoutState, routerState } = useRootLayout()
    return (
        <div
            data-scope="device"
            data-part="root"
            data-state={layoutState}
            aria-busy={routerState.isLoading || routerState.isTransitioning}
            className={`
                min-h-[550px] w-[328px] p-3
                @md:mx-auto
                group
                flex flex-col rounded-t-hds-sm rounded-b-hds-lg
                border-solid border-gradient-hds-155deg-utility-tint-system-skeuo-surface-600-350
                border-[width:var(--size-scale-hds-0-375)]
                bg-gradient-hds-152deg-system-skeuo-surface-950-700
                shadow-[var(--shadow-hds-bevel-inwards-300),var(--shadow-hds-bevel-inwards-side),var(--shadow-hds-outwards-400)]
                relative before:absolute before:content-[' '] before:rounded-[inherit]
                before:inset-0 before:block before:size-full
                before:opacity-20
                before:pointer-events-none
                before:[background:var(--texture-hds-metal)]
            `}
        >
            {children}
        </div>
    )
}
export const Device = Object.assign(RootDevice, {
    NavSlider,
    ActionsIsland,
})
