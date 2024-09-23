import type { PropsWithChildren } from "preact/compat"
import { useRef } from "preact/hooks"
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
