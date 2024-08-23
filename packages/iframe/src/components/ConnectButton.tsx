import { useState } from "react"

import type { ConnectionProvider } from "@happychain/sdk-shared"
import clsx from "clsx"

import { useInjectedProviders } from "../hooks/useInjectedProviders"
import { useSocialProviders } from "../hooks/useSocialProviders"
import { dappMessageBus } from "../services/eventBus"

export function ConnectButton() {
    const [isOpen, setIsOpen] = useState(false)

    const web3Providers = useInjectedProviders()
    const socialProviders = useSocialProviders()

    function open() {
        dappMessageBus.emit("modal-toggle", true)

        setIsOpen(true)
    }

    function close() {
        setIsOpen(false)
        // delay to match fadeout transition/animation
        const animationTimeInMs = 300
        setTimeout(() => {
            dappMessageBus.emit("modal-toggle", false)
        }, animationTimeInMs)
    }

    async function connect(provider: ConnectionProvider) {
        await provider.enable()
        close()
    }

    return (
        <>
            <main className="min-h-dvh w-screen">
                <button type="button" onClick={open} className="btn btn-primary fixed right-4 top-4 h-12 w-20">
                    Login
                </button>
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
                <div
                    className={clsx(
                        // using opacity here so fade in/out can be animated
                        // the button itself is conditionally rendered, so once connected this is all unmounted
                        !isOpen && "pointer-events-none opacity-0",
                        isOpen && "opacity-100",
                        "fixed bottom-0 left-0 right-0 top-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm transition duration-300",
                    )}
                    onClick={close}
                >
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
                    <div
                        className="flex-coll flex gap-4 rounded-md bg-zinc-100 p-8"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <img alt="HappyChain Logo" src="/happychain.png" className="mx-auto h-24 w-24" />
                                <p className="text-2xl font-bold">HappyChain</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-4">
                            {socialProviders.concat(web3Providers).map((prov) => {
                                return (
                                    <button
                                        type="button"
                                        key={prov.id}
                                        onClick={() => connect(prov)}
                                        className="flex w-full items-center gap-4 bg-zinc-200 px-4 py-2 shadow-md transition hover:scale-[103%] hover:bg-white focus:shadow active:scale-[95%]"
                                    >
                                        <img className="h-8 w-8" src={prov.icon} alt={`${prov.name} icon`} />
                                        {prov.name}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </main>
        </>
    )
}
