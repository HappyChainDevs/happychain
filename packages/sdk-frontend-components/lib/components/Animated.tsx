import type { PropsWithChildren } from "react"
import { useRef } from "react"
import CSSTransition from "react-transition-group/CSSTransition"
import SwitchTransition from "react-transition-group/SwitchTransition"
export function Animated({ state, children }: { state: string } & PropsWithChildren) {
    const animatedTextRef = useRef(null)

    return (
        <SwitchTransition>
            <CSSTransition key={state} nodeRef={animatedTextRef} timeout={300} classNames="slide">
                <div ref={animatedTextRef} className="happychain-status">
                    {children}
                </div>
            </CSSTransition>
        </SwitchTransition>
    )
}
