/** @jsxImportSource preact */
import type { PropsWithChildren } from "preact/compat"
import { useRef } from "preact/hooks"
// import CSSTransition from "react-transition-group/CSSTransition"
// import SwitchTransition from "react-transition-group/SwitchTransition"

// biome-ignore lint/correctness/noUnusedVariables: need to fix the css animations
export function Animated({ state, children }: { state: string } & PropsWithChildren) {
    const animatedTextRef = useRef(null)

    return (
        <div ref={animatedTextRef} className="happychain-status">
            {children}
        </div>
    )
    // TODO: this animations pull in react in its entirety during the build step :/
    // return (
    //     // @ts-ignore
    //     <SwitchTransition>
    //         {/* @ts-ignore react/preact type issue */}
    //         <CSSTransition key={state} nodeRef={animatedTextRef} timeout={300} classNames="slide">
    //             {/* @ts-ignore react/preact type issue */}
    //             <div ref={animatedTextRef} className="happychain-status">
    //                 {children}
    //             </div>
    //         </CSSTransition>
    //     </SwitchTransition>
    // )
}
