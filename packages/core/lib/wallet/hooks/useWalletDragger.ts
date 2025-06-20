import { throttle } from "@happy.tech/common"
import type { RefObject } from "preact"
import { useCallback, useEffect, useRef, useState } from "preact/hooks"
import { browserFeatures, isChrome, makeBlankImage } from "../utils"
import { useBreakpoint } from "./useBreakpoint"

/**
 * Default height of the draggable wallet handle in pixels.
 * Used as a fallback before we can measure the actual height.
 */
const DEFAULT_HEIGHT = 56

/**
 * A blank image used to suppress the browser's default drag "ghost" image.
 * This creates a cleaner drag UX, where native drag is supported.
 */
const blank = makeBlankImage()

/**
 * Rounds a fractional offset to 4 decimal places.
 * Prevents floating point drift and keeps percentages consistent in storage/UI.
 */
const roundedOffset = (offset: number) => Math.round(offset * 10000) / 10000

/**
 * Retrieves the cached vertical offset of the wallet from localStorage,
 * multiplied by the current usable height to get an absolute pixel value.
 *
 * `usableWindowHeight` is passed in rather than computed here so the caller can
 * decide how to account for dynamic UI elements (like the handle height).
 */
const getCachedPosition = (usableWindowHeight: number) => {
    return Math.max(Number(localStorage.getItem("happychain:handlePosition.y") || 0), 0) * usableWindowHeight
}

/**
 * Saves the handle's vertical position as a **percentage** (between 0 and 1) of
 * the usable window height. This allows consistent positioning across resizes.
 */
const cachePosition = (position: number, usableWindowHeight: number) => {
    localStorage.setItem(
        "happychain:handlePosition.y",
        Math.min(Math.max(roundedOffset(position / usableWindowHeight), 0), 1).toString(),
    )
}

/**
 * Safely retrieves the bounding client rectangle of a given HTMLElement reference.
 */
function getBoundingRectFromRef(ref: HTMLElement | null) {
    return ref?.getBoundingClientRect?.()
}

/**
 * Ensures the drag offset stays within bounds:
 * - not less than 0 (top of screen)
 * - not greater than maxHeight (bottom limit)
 */
function getBoundedOffset(boxTop: number, maxHeight: number) {
    return Math.min(Math.max(boxTop, 0), maxHeight)
}

function useWalletDragSharedState(containerRef: RefObject<HTMLElement | null>) {
    // we will hardcode 56 on page load as the default height, but on click we re-evaluate
    const [boundingRect, setBoundingRect] = useState({ height: DEFAULT_HEIGHT })
    // absolute position of wallet onscreen (y axis in pixels)
    const [handleOffset, setHandleOffset] = useState(() =>
        typeof window === "undefined" ? 0 - DEFAULT_HEIGHT : getCachedPosition(window.innerHeight - DEFAULT_HEIGHT),
    )

    // relative offset to move orb since clicks won't be perfectly centered on orb
    const [dragStartOffset, setDragStartOffset] = useState(0)

    // is the orb currently dragging
    const [dragging, setDragging] = useState(false)

    const getMaxHeight = useCallback(() => window.innerHeight - boundingRect.height, [boundingRect.height])

    const maxHeight = getMaxHeight()
    const pxOffset = boundingRect.height * (handleOffset / maxHeight)

    // offset in percentage (so resizes, will retain same location onscreen)
    const walletOffset = roundedOffset(handleOffset / maxHeight) * -100

    // Update offset on resize
    useEffect(() => {
        const handleResize = () => {
            const maxHeight = getMaxHeight()
            const nextOffset = getBoundedOffset(getCachedPosition(maxHeight), maxHeight)
            setHandleOffset(nextOffset)
        }

        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [getMaxHeight])

    return {
        // firefox and others don't properly support native drag-and-drop
        enableNativeDrag: browserFeatures.dragAndDrop && isChrome,
        containerRef,
        boundingRect,
        setBoundingRect,
        dragging,
        setDragging,
        handleOffset,
        setHandleOffset,
        dragStartOffset,
        setDragStartOffset,
        getMaxHeight,

        // Computed distance that expanded wallet should open
        // 0% means open down (top of screen), -100% means open up (bottom of screen), -50% means open from middle
        walletOffset: `calc(${walletOffset}% + ${pxOffset}px)`,
    }
}

function useNativeDrag(shared: ReturnType<typeof useWalletDragSharedState>) {
    const {
        dragging,
        setDragging,
        dragStartOffset,
        handleOffset,
        boundingRect,
        setBoundingRect,
        setDragStartOffset,
        setHandleOffset,
        containerRef,
    } = shared

    function onDragStart(e: DragEvent) {
        if (!e.dataTransfer) return

        setDragging(true)

        const rec = getBoundingRectFromRef(containerRef.current)
        if (rec) setBoundingRect(rec)
        setDragStartOffset(e.clientY - handleOffset)

        // Disables ghosting. cf. makeBlankImage docstring
        // note: works on chrome, broken on safari in some cases (safari will use useCustomDrag)
        if (blank) e.dataTransfer.setDragImage(blank, 0, 0)
    }

    function onDragEnd(e: DragEvent) {
        setDragging(false)

        const nextOffset = getBoundedOffset(e.clientY - dragStartOffset, window.innerHeight - boundingRect.height)
        setHandleOffset(nextOffset)
        // We persist the percentage, so that if window opens in a different resolution, the grabber
        // will still be in the same 'location'

        cachePosition(nextOffset, window.innerHeight - boundingRect.height)
    }

    const onDrag = throttle((e: DragEvent) => {
        // On release it always emits a single event with a layerY of 0, moving us to the top
        // of the screen. To solve this, we can safely ignore exactly zero here,
        // since onDragEnd also sets the value on release, so any 'exactly zero' releases will still
        // succeed. This is only for the animation, and skipping 0.001px (exactly 0px)
        // is not noticeable by the user
        if (!e.clientY) return

        const nextOffset = getBoundedOffset(e.clientY - dragStartOffset, window.innerHeight - boundingRect.height)
        setHandleOffset(nextOffset)
    })

    return {
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

function useCustomDrag(shared: ReturnType<typeof useWalletDragSharedState>) {
    const {
        dragging,
        setDragging,
        dragStartOffset,
        handleOffset,
        setBoundingRect,
        setDragStartOffset,
        setHandleOffset,
        getMaxHeight,
        enableNativeDrag,
        containerRef,
    } = shared

    // only enabled if nativeDrag is not supported
    const enabled = !enableNativeDrag

    // Firefox: need to disable userSelect manually during drag to avoid highlighting everything
    const initialUserSelect = useRef(typeof document !== "undefined" ? document.body.style.userSelect : "")

    // FireFox: differentiate between click and drag on devices where html5 draggable doesn't work properly
    const [hasMoved, setHasMoved] = useState(false)

    const unsubscribe = useRef<null | (() => void)>(null)

    // Mouse up listener (end drag)
    useEffect(() => {
        if (!enabled || !dragging) return

        const onDragEnd = (e: MouseEvent | FocusEvent) => {
            e.preventDefault()
            e.stopPropagation()
            document.body.style.userSelect = initialUserSelect.current
            // setTimeout to defer the state change, so that the drag event can complete without
            // a click event triggering the wallet to open
            setTimeout(() => setDragging(false), 0)
        }

        window.addEventListener("mouseup", onDragEnd)
        window.addEventListener("blur", onDragEnd)
        window.addEventListener("contextmenu", onDragEnd)
        return () => {
            window.removeEventListener("mouseup", onDragEnd)
            window.removeEventListener("blur", onDragEnd)
            window.removeEventListener("contextmenu", onDragEnd)
        }
    }, [enabled, dragging, setDragging])

    // Mouse move listener (dragging)
    useEffect(() => {
        if (!enabled || !dragging) {
            // Stop if no longer dragging
            if (unsubscribe.current) {
                unsubscribe.current()
                unsubscribe.current = null
            }
            return
        }

        const onDrag = (e: MouseEvent) => {
            if (!e.clientY) return
            if (e.buttons === 0) {
                // No buttons held down — abort drag
                document.body.style.userSelect = initialUserSelect.current
                setDragging(false)
                return
            }

            setHasMoved(true)
            document.body.style.userSelect = "none"

            const maxHeight = getMaxHeight()
            const nextOffset = getBoundedOffset(e.clientY - dragStartOffset, maxHeight)
            setHandleOffset(nextOffset)
            cachePosition(nextOffset, maxHeight)
        }

        window.addEventListener("mousemove", onDrag)
        unsubscribe.current = () => window.removeEventListener("mousemove", onDrag)

        return () => {
            if (unsubscribe.current) {
                unsubscribe.current()
                unsubscribe.current = null
            }
        }
    }, [enabled, dragging, dragStartOffset, getMaxHeight, setHandleOffset, setDragging])

    return {
        // won't register as 'dragging' until it has actually moved. otherwise its a click
        dragging: dragging && hasMoved,

        dragProps: {
            // browsers that don't support dragging need to handle this manually
            draggable: false,
            // mouse down on the orb, however other listeners (e.g. mouse move) will be on the
            // full document as native drag events are not supported
            onMouseDown: (e: MouseEvent) => {
                if (e.button !== 0) return // only left click
                setHasMoved(false)
                e.preventDefault()
                e.stopPropagation()
                setDragging(true)

                const rec = getBoundingRectFromRef(containerRef.current)
                if (rec) setBoundingRect(rec)
                setDragStartOffset(e.clientY - handleOffset)
            },
        },
    }
}

export function useWalletDragger({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
    const isDesktop = useBreakpoint("md")
    const shared = useWalletDragSharedState(containerRef)
    const nativeDrag = useNativeDrag(shared)
    const customDrag = useCustomDrag(shared)

    const dragger = shared.enableNativeDrag ? nativeDrag : customDrag

    return {
        dragging: dragger.dragging,
        dragProps: dragger.dragProps,
        // on mobile, set offset to zero (top of screen, un-draggable)
        walletOffset: isDesktop ? shared.walletOffset : 0,
        handleOffset: isDesktop ? shared.handleOffset : 0,
    }
}
