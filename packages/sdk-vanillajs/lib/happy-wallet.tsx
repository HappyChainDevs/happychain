/** @jsxImportSource preact */
import { AuthState, config } from "@happychain/sdk-shared"
import { clsx } from "clsx"
import { GripVerticalIcon } from "lucide-preact"
import { animate } from "motion"
import { useEffect, useRef, useState } from "preact/hooks"
import cssStyles from "./happy-wallet.css?inline"
import { icon64x64 } from "./happyProvider/icons"
import { onAuthStateUpdate, onModalUpdate } from "./happyProvider/initialize"

const SMALL_WIDTH = "48px" //"24px"
const SMALL_HEIGHT = "48px" //"24px"
const SMALL_BORDER_RADIUS = "24px" // width-height / 2
const LARGE_WIDTH = "24rem" //"192px"
const LARGE_HEIGHT = "32rem" //"192px"

function filterUndefinedValues(obj: { [k: string]: string | undefined }): { [k: string]: string } {
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v)) as { [k: string]: string }
}

function onErrorHandler() {
    console.error("HappyChain SDK failed to initialize")
}

export function HappyWallet({ windowId, chain, rpcUrl }: { windowId: string; chain: string; rpcUrl: string }) {
    const [handleOffset, setHandleOffset] = useState(window.innerHeight / 4)
    const [walletOffset, setWalletOffset] = useState(handleOffset / window.innerHeight)
    const [dragging, setDragging] = useState(false)
    const [dragStartOffset, setDragStartOffset] = useState(handleOffset)

    const [isOpen, setIsOpen] = useState(false)

    return (
        <>
            <style>{cssStyles}</style>
            <div
                style={{
                    "--tw-translate-y": `${handleOffset}px`,
                }}
                className={`pl-4 py-4 fixed top-0 right-0 ${isOpen || dragging ? "transition-none" : "transition"} ${isOpen ? "translate-x-0" : "translate-x-5"} hover:translate-x-0 text-black flex items-center rounded-l-full`}
            >
                <div
                    className="bg-zinc-700 border-l-1 border-y-1 shadow-xl border-slate-400 rounded-l-full flex items-center cursor-grab"
                    style={{ width: "96px" }}
                    draggable={true}
                    onDragStart={(e) => {
                        if (!e.dataTransfer) return
                        setDragging(true)
                        setDragStartOffset(e.layerY - handleOffset)

                        // disable dragging 'ghost'
                        const img = new Image()
                        img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs="
                        e.dataTransfer.setDragImage(img, 0, 0)
                    }}
                    onDragEnd={(e) => {
                        setDragging(false)
                        const nextOffset = e.layerY - dragStartOffset
                        setHandleOffset(nextOffset)
                        setWalletOffset(nextOffset / window.innerHeight) // NOTE: this DOES NOT account for the height of the handle, about 52 px currently, and it should
                    }}
                    onDrag={(e) => {
                        // on release it always emits a layerY of 0, moving us to the top
                        // we can safely ignore exactly zero here, since onDragEnd also sets, so
                        // if the user released exactly on 0, we would allow it
                        if (e.layerY && dragging) {
                            const nextOffset = e.layerY - dragStartOffset
                            setHandleOffset(nextOffset)
                            setWalletOffset(nextOffset / window.innerHeight) // NOTE: this DOES NOT account for the height of the handle, about 52 px currently, and it should
                        }
                    }}
                >
                    {/* we wrap this so that we have a fixed 'skeleton' in our handle */}
                    {/* but can animate/manage our iframe size easier and independently  */}
                    <div
                        className={"relative flex items-center justify-center m-1 cursor-auto"}
                        style={{
                            width: SMALL_WIDTH,
                            height: SMALL_HEIGHT,
                            "--wallet-offset-y": `${walletOffset * -100}%`,
                        }}
                    >
                        <Wallet windowId={windowId} chain={chain} rpcUrl={rpcUrl} onOpenChange={setIsOpen} />
                    </div>

                    {/* grabber icon */}
                    <GripVerticalIcon
                        className={"text-slate-300 absolute -right-0"}
                        style={{ width: SMALL_WIDTH, height: SMALL_HEIGHT }}
                    />
                </div>
            </div>
        </>
    )
}

function Wallet({
    windowId,
    chain,
    rpcUrl,
    onOpenChange,
}: { windowId: string; chain: string; rpcUrl: string; onOpenChange: (open: boolean) => void }) {
    const ref = useRef(null)
    const iframe = useRef(null)

    const [authState, setAuthState] = useState(AuthState.Connecting)
    const [isOpen, setIsOpen] = useState(false)
    useEffect(() => onModalUpdate((state) => setIsOpen(state.isOpen)), [])
    useEffect(() => onAuthStateUpdate(setAuthState), [])
    useEffect(() => {
        onOpenChange(isOpen)
        const openHandler = () => isOpen && setIsOpen(false)
        document.addEventListener("click", openHandler)
        return () => document.removeEventListener("click", openHandler)
    }, [isOpen, onOpenChange])

    useEffect(() => {
        if (!ref.current || !iframe.current) return
        if (isOpen) {
            animate(
                ref.current,
                {
                    height: [SMALL_HEIGHT, LARGE_HEIGHT],
                    width: [SMALL_WIDTH, LARGE_WIDTH],
                    transform: ["translateY(0)", "translateY(var(--wallet-offset-y))"],
                    borderRadius: [SMALL_BORDER_RADIUS, SMALL_BORDER_RADIUS],
                },
                // { // these worked in my demo and are nice, but seem broken now :thinking:
                //     height: { easing: spring() },
                //     width: { easing: spring() },
                //     borderRadius: { easing: glide() },
                // },
            )
            animate(iframe.current, {
                opacity: [0, 1],
            })
        } else {
            animate(
                ref.current,
                {
                    height: [null, SMALL_HEIGHT],
                    width: [null, SMALL_WIDTH],
                    transform: [null, "translateY(0)"],
                    borderRadius: [null, SMALL_BORDER_RADIUS],
                },
                // {
                //     height: { easing: spring() },
                //     width: { easing: spring() },
                // },
            )
            animate(iframe.current, {
                opacity: [null, 0],
            })
        }
    }, [isOpen])

    const connected = authState === AuthState.Connected
    const connecting = authState === AuthState.Connecting
    const disconnected = authState === AuthState.Disconnected

    const classes = {
        // never open while connecting
        open: isOpen && !connecting,
        closed: !isOpen || connecting,

        connected: connected,
        disconnected: disconnected,
        connecting: connecting,

        // show login modal mode when connecting or disconnected
        modal: !connected && isOpen,
    }

    const url = new URL("embed", config.iframePath)

    const searchParams = new URLSearchParams(
        filterUndefinedValues({ windowId: windowId, chain: chain, "rpc-urls": rpcUrl }),
    ).toString()

    const iframePermissions = navigator.userAgent.includes("Firefox")
        ? "" // avoid warning in Firefox (safe: permissions inherited by default)
        : "; clipboard-write 'src'" // explicit grant needed at least for Chrome

    return (
        // biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
        <div
            ref={ref}
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIsOpen((opn) => !opn)
            }}
            style={{ transform: "translateY(var(--wallet-offset-y))" }}
            className={`absolute top-0 right-0 origin-top-right aspect-square transition-al overflow-hidden ${authState === AuthState.Connected ? "bg-sky-500" : "bg-rose-600 "}`}
        >
            <img
                src={icon64x64}
                alt=""
                style={{ width: SMALL_WIDTH, height: SMALL_HEIGHT }}
                className={`absolute top-0 right-0 w-full transition-opacity ${isOpen ? "opacity-0" : "opacity-100"}`}
            />

            <div className={"absolute right-0 top-0 left-0 bottom-0"} style={{ width: "100%", height: "100%" }}>
                <iframe
                    ref={iframe}
                    title="happy-iframe"
                    onError={onErrorHandler}
                    src={`${url.href}?${searchParams}`}
                    className={clsx(classes)}
                    style={{
                        border: "none",
                        // transitionProperty: "opacity",
                        // transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
                        // transitionDuration: 150,
                        pointerEvents: isOpen ? "" : "none", // TODO: fix this, should be open ? '' : 'none
                        // pointerEvents: open ? "" : "none",
                        // opacity: isOpen ? 1 : 0,
                        width: "100%",
                        height: "100%",
                    }}
                    allow={iframePermissions}
                />
            </div>
        </div>
    )
}

// export function HappyWallet({ windowId, chain, rpcUrl }: { windowId: string; chain: string; rpcUrl: string }) {
//     const [authState, setAuthState] = useState(AuthState.Connecting)
//     const [isOpen, setIsOpen] = useState(false)

//     useEffect(() => onModalUpdate((state) => setIsOpen(state.isOpen)), [])
//     useEffect(() => onAuthStateUpdate(setAuthState), [])
//     useEffect(() => {
//         const openHandler = () => isOpen && setIsOpen(false)
//         document.addEventListener("click", openHandler)
//         return () => document.removeEventListener("click", openHandler)
//     }, [isOpen])

// const url = new URL("embed", config.iframePath)

// const searchParams = new URLSearchParams( filterUndefinedValues({ windowId: windowId, chain: chain, "rpc-urls": rpcUrl }),).toString()

// const connected = authState === AuthState.Connected
// const connecting = authState === AuthState.Connecting
// const disconnected = authState === AuthState.Disconnected

// const classes = {
//     // never open while connecting
//     open: isOpen && !connecting,
//     closed: !isOpen || connecting,

//     connected: connected,
//     disconnected: disconnected,
//     connecting: connecting,

//     // show login modal mode when connecting or disconnected
//     modal: !connected && isOpen,
// }

//     // https://developer.mozilla.org/en-US/docs/Web/HTTP/Permissions_Policy#allowlists
//     // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Permissions-Policy#iframes
//     // Standard: permissions inherited by default for iframe origin.
//     // biome-ignore format: comments
//     const iframePermissions =
//       navigator.userAgent.includes("Firefox")
//           ? "" // avoid warning in Firefox (safe: permissions inherited by default)
//           : "; clipboard-write 'src'" // explicit grant needed at least for Chrome

//     return (
//         <>
//             <style>{cssStyles}</style>
//             <iframe
//                 title="happy-iframe"
//                 onError={onErrorHandler}
//                 src={`${url.href}?${searchParams}`}
//                 className={clsx(classes)}
//                 style={{ border: "none" }}
//                 allow={iframePermissions}
//             />
//         </>
//     )
// }
