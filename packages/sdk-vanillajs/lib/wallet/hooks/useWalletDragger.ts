import { useState } from "preact/hooks"
import { makeBlankImage } from "../utils"

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
        setDragStartOffset(e.layerY - handleOffset)

        // Disables ghosting. cf. makeBlankImage docstring
        e.dataTransfer.setDragImage(blank, 0, 0)
    }

    function onDragEnd(e: DragEvent) {
        setDragging(false)
        const nextOffset = e.layerY - dragStartOffset
        setHandleOffset(nextOffset)

        // NOTE: this DOES NOT account for the height of the handle
        // so we are not transforming from the center of the handle
        setWalletOffset(roundedOffset(nextOffset / window.innerHeight))
    }

    function onDrag(e: DragEvent) {
        // On release it always emits a single event with a layerY of 0, moving us to the top
        // of the screen. To solve this, we can safely ignore exactly zero here,
        // since onDragEnd also sets the value on release, so any 'exactly zero' releases will still
        // succeed. This is only for the animation, and skipping 0.001px (exactly 0px)
        // is not noticeable by the user
        if (e.layerY && dragging) {
            const nextOffset = e.layerY - dragStartOffset
            setHandleOffset(nextOffset)

            // NOTE: this DOES NOT account for the height of the handle
            // so we are not transforming from the center of the handle
            setWalletOffset(roundedOffset(nextOffset / window.innerHeight))
        }
    }

    return {
        handleOffset,
        walletOffset,
        dragging,
        dragProps: { draggable: true, onDragStart, onDragEnd, onDrag },
    }
}
