import type { PropsWithChildren } from "preact/compat"
import { useRef } from "preact/hooks"
import CSSTransition from "react-transition-group/CSSTransition"
import SwitchTransition from "react-transition-group/SwitchTransition"
export function Animated({ state, children }: { state: string } & PropsWithChildren) {
    const animatedTextRef = useRef(null)

    return (
        // @ts-ignore
        <SwitchTransition>
            {/* @ts-ignore */}
            <CSSTransition key={state} nodeRef={animatedTextRef} timeout={300} classNames="slide">
                {/* @ts-ignore */}
                <div ref={animatedTextRef} className="happychain-status">
                    {children}
                </div>
            </CSSTransition>
        </SwitchTransition>
    )
}
