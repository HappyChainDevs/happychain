import { throttle } from "@happychain/common"
import { useEffect, useRef, useState } from "preact/hooks"
import { isFirefox, makeBlankImage } from "../utils"

const blank = makeBlankImage()

const roundedOffset = (offset: number) => Math.round(offset * 10000) / 10000

// we can't get the max bound since we may not know the element height here
const getCachedPosition = () => {
    return Math.max(Number(localStorage.getItem("happychain:handlePosition.y") || 0), 0) * window.innerHeight
}
const cachePosition = (position: number) => {
    localStorage.setItem(
        "happychain:handlePosition.y",
        Math.min(Math.max(roundedOffset(position / window.innerHeight), 0), 1).toString(),
    )
}

function useNativeDrag({ enabled }: { enabled: boolean }) {
    // we will hardcode 48 on page load as the default height, but on click we re-evaluate
    const [boundingRec, setBoundingRec] = useState({ height: 48 })
    // absolute position of wallet onscreen (y axis in pixels)
    const [handleOffset, setHandleOffset] = useState(getCachedPosition())

    // offset in percentage (so resizes, will retain same location onscreen)
    // const [walletOffset, setWalletOffset] = useState(roundedOffset(handleOffset / window.innerHeight))
    // relative offset to move orb since clicks won't be perfectly centered on orb
    const [dragStartOffset, setDragStartOffset] = useState(0)

    // is the orb currently dragging
    const [dragging, setDragging] = useState(false)

    // resize handler
    useEffect(() => {
        if (!enabled) return

        const handleResize = () => {
            const nextOffset = Math.min(Math.max(getCachedPosition(), 0), window.innerHeight - boundingRec.height)
            setHandleOffset(nextOffset)
        }

        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    })

    function onDragStart(e: DragEvent) {
        if (!e.dataTransfer) return

        setDragging(true)

        if (e.target && "getBoundingClientRect" in e.target && typeof e.target.getBoundingClientRect === "function") {
            setBoundingRec(e.target.getBoundingClientRect?.())
        }

        setDragStartOffset(e.clientY - handleOffset)

        // Disables ghosting. cf. makeBlankImage docstring
        e.dataTransfer.setDragImage(blank, 0, 0)
    }

    function onDragEnd(e: DragEvent) {
        setDragging(false)

        const nextOffset = Math.min(Math.max(e.clientY - dragStartOffset, 0), window.innerHeight - boundingRec.height)

        setHandleOffset(nextOffset)
        // We persist the percentage, so that if window opens in a different resolution, the grabber
        // will still be in the same 'location'

        cachePosition(nextOffset)
    }

    const onDrag = throttle((e: DragEvent) => {
        // On release it always emits a single event with a layerY of 0, moving us to the top
        // of the screen. To solve this, we can safely ignore exactly zero here,
        // since onDragEnd also sets the value on release, so any 'exactly zero' releases will still
        // succeed. This is only for the animation, and skipping 0.001px (exactly 0px)
        // is not noticeable by the user
        if (!e.clientY) return

        const nextOffset = Math.min(Math.max(e.clientY - dragStartOffset, 0), window.innerHeight - boundingRec.height)

        setHandleOffset(nextOffset)
    })

    return {
        // Y offset of orb
        handleOffset,

        // Computed percentage that expanded wallet should open
        // 0% means open down (top of screen), -100% means open up (bottom of screen), -50% means open from middle
        walletOffset: roundedOffset(handleOffset / (window.innerHeight + boundingRec.height - dragStartOffset)) * -100,
        dragging,
        dragProps: {
            // browsers that properly support dragging
            draggable: true,
            onDragStart,
            onDragEnd,
            onDrag,
        },
    }
}

function useCustomDrag({ enabled }: { enabled: boolean }) {
    // we will hardcode 48 on page load as the default height, but on click we re-evaluate
    const [boundingRec, setBoundingRec] = useState({ height: 48 })
    // absolute position of wallet onscreen (y axis in pixels)
    const [handleOffset, setHandleOffset] = useState(getCachedPosition())

    // relative offset to move orb since clicks won't be perfectly centered on orb
    const [dragStartOffset, setDragStartOffset] = useState(0)
    const [dragging, setDragging] = useState(false)
    // Firefox: need to disable userSelect manually during drag to avoid highlighting everything
    const [initialUserSelect] = useState(document.body.style.userSelect)

    // FireFox: differentiate between click and drag on devices where html5 draggable doesn't work properly
    const [hasMoved, setHasMoved] = useState(false)

    useEffect(() => {
        if (!enabled) return

        const handleResize = () => {
            const nextOffset = Math.min(Math.max(getCachedPosition(), 0), window.innerHeight - boundingRec.height)
            setHandleOffset(nextOffset)
        }

        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    })

    useEffect(() => {
        if (!enabled) return

        const onDragEnd = (e: MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()
            document.body.style.userSelect = initialUserSelect
            // we must wait till next tick before updating this so that the click event to open
            // the wallet still believes us to be dragging, and therefore won't open on dragEnd
            setTimeout(() => setDragging(false), 0)
            // We persist the percentage, so that if window opens in a different resolution, the grabber
            // will still be in the same 'location'
        }
        window.addEventListener("mouseup", onDragEnd)
        return () => {
            window.removeEventListener("mouseup", onDragEnd)
        }
    }, [initialUserSelect, enabled])

    const unsubscribe = useRef<null | (() => void)>(null)

    useEffect(() => {
        if (!enabled) return

        if (!dragging) {
            // if dragging has stopped, but unsubscribe hasn't been called,
            // we must call manually here, as we can't rely on useEffect cleanup
            if (unsubscribe.current) {
                unsubscribe.current?.()
                unsubscribe.current = null
            }
            return
        }

        const onDragStableCallback = (e: MouseEvent) => {
            if (!enabled) return

            if (!dragging) return
            setHasMoved(true)

            document.body.style.userSelect = "none"

            if (e.clientY) {
                const nextOffset = Math.min(
                    Math.max(e.clientY - dragStartOffset, 0),
                    window.innerHeight - boundingRec.height,
                )
                setHandleOffset(nextOffset)

                cachePosition(nextOffset)
            }
        }

        window.addEventListener("mousemove", onDragStableCallback)

        // Handle unsub manually, don't rely on useEffect re-triggers
        unsubscribe.current = () => {
            window.removeEventListener("mousemove", onDragStableCallback)
        }
    }, [dragging, dragStartOffset, boundingRec.height, enabled])

    return {
        handleOffset,

        // Computed percentage that expanded wallet should open
        // 0% means open down (top of screen), -100% means open up (bottom of screen), -50% means open from middle
        walletOffset: roundedOffset(handleOffset / (window.innerHeight + boundingRec.height - dragStartOffset)) * -100,

        // won't register as 'dragging' until it has actually moved. otherwise its a click
        dragging: dragging && hasMoved,

        dragProps: {
            // browsers that don't support dragging need to handle this manually
            draggable: false,
            onMouseDown: (e: MouseEvent) => {
                setHasMoved(false)
                e.preventDefault()
                e.stopPropagation()
                setDragging(true)

                if (
                    e.target &&
                    "getBoundingClientRect" in e.target &&
                    typeof e.target.getBoundingClientRect === "function"
                ) {
                    setBoundingRec(e.target.getBoundingClientRect?.())
                }
                setDragStartOffset(e.clientY - handleOffset)
            },
        },
    }
}

export function useWalletDragger() {
    const nativeDrag = useNativeDrag({ enabled: !isFirefox })
    const customDrag = useCustomDrag({ enabled: isFirefox })

    return isFirefox ? customDrag : nativeDrag
}
