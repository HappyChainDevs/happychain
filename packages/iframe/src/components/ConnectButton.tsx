import { type ConnectionProvider, Msgs } from "@happychain/sdk-shared"
import clsx from "clsx"

import { ModalStates } from "@happychain/sdk-shared/lib/interfaces/events"
import { useInjectedProviders } from "../hooks/useInjectedProviders"
import { useSocialProviders } from "../hooks/useSocialProviders"
import { appMessageBus } from "../services/eventBus"

function open() {
    void appMessageBus.emit(Msgs.ModalToggle, true)
}

function close() {
    void appMessageBus.emit(Msgs.ModalToggle, false)
}

async function connect(provider: ConnectionProvider) {
    await provider.enable()
    close()
}

appMessageBus.on(Msgs.RequestDisplay, (screen) => {
    if (screen === ModalStates.LOGIN) {
        open()
    }
})

export function ConnectButton() {
    const web3Providers = useInjectedProviders()
    const socialProviders = useSocialProviders()

    return (
        <>
            <main className="h-screen w-screen rounded-xl overflow-hidden">
                <button type="button" onClick={open} className="btn btn-primary w-full h-full lg:hidden">
                    Login
                </button>
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
                <div
                    className={clsx(
                        "fixed bottom-0 left-0 right-0 top-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm transition duration-0 lg:duration-300 opacity-0 pointer-events-none lg:pointer-events-auto lg:opacity-100",
                    )}
                    onClick={close}
                >
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
                    <div className="flex gap-4 rounded-md bg-zinc-100 p-8" onClick={(e) => e.stopPropagation()}>
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
