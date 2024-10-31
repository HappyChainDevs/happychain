import { throttle } from "@happychain/common"
import { useState } from "preact/hooks"
import { isFirefox, makeBlankImage } from "../utils"

const blank = makeBlankImage()

const roundedOffset = (offset: number) => Math.round(offset * -10000) / 100

export function useWalletDragger() {
    const [handleOffset, setHandleOffset] = useState(window.innerHeight / 4)
    const [walletOffset, setWalletOffset] = useState(roundedOffset(handleOffset / window.innerHeight))
    const [dragStartOffset, setDragStartOffset] = useState(handleOffset)
    const [dragging, setDragging] = useState(false)

    function onDragStart(e: DragEvent) {
        if (!e.dataTransfer) return
        setDragging(true)
        setDragStartOffset(e.clientY - handleOffset)

        // Disables ghosting. cf. makeBlankImage docstring
        e.dataTransfer.setDragImage(blank, 0, 0)
    }

    function onDragEnd(e: DragEvent) {
        setDragging(false)

        const nextOffset = e.clientY - dragStartOffset

        setHandleOffset(nextOffset)

        // NOTE: this DOES NOT account for the height of the handle
        // so we are not transforming from the center of the handle
        setWalletOffset(roundedOffset(nextOffset / window.innerHeight))
    }

    const onDrag = throttle((e: DragEvent) => {
        // On release it always emits a single event with a layerY of 0, moving us to the top
        // of the screen. To solve this, we can safely ignore exactly zero here,
        // since onDragEnd also sets the value on release, so any 'exactly zero' releases will still
        // succeed. This is only for the animation, and skipping 0.001px (exactly 0px)
        // is not noticeable by the user
        if (e.clientY) {
            const nextOffset = e.clientY - dragStartOffset

            setHandleOffset(nextOffset)

            // NOTE: this DOES NOT account for the height of the handle
            // so we are not transforming from the center of the handle
            setWalletOffset(roundedOffset(nextOffset / window.innerHeight))
        }
    })

    return {
        handleOffset,
        walletOffset,
        dragging,
        dragProps: {
            draggable: true,
            onDragStart,
            onDragEnd,
            /**
             * Firefox doesn't correctly set clientY on the onDrag event
             * https://stackoverflow.com/questions/11656061/why-is-event-clientx-incorrectly-showing-as-0-in-firefox-for-dragend-event
             *
             * Here we are using onDragOver as a substitute, however this means that if the mouse moves
             * _off_ the visible element, it stops following. when the user releases, the onDragEnd
             * event still fires, so the grabber will still end where its meant to be, its just a less
             * than ideal animation effect.
             *
             * The alternative would be to have a onDragOver listener for the entire window, however
             * I believe this is too invasive for a library such as this, and not worth the trade off
             */
            ...(isFirefox ? { onDragOver: onDrag } : { onDrag }),
        },
    }
}
