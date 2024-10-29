import { type ConnectionProvider, Msgs } from "@happychain/sdk-shared"
import { ModalStates } from "@happychain/sdk-shared"
import clsx from "clsx"
import happychainLogo from "../assets/happychain.png"
import { useInjectedProviders } from "../hooks/useInjectedProviders"
import { useSocialProviders } from "../hooks/useSocialProviders"
import { appMessageBus } from "../services/eventBus"

function setModalState({ isOpen, cancelled }: Parameters<typeof appMessageBus.emit<Msgs.ModalToggle>>[1]) {
    void appMessageBus.emit(Msgs.ModalToggle, {
        isOpen,
        cancelled,
    })
}

async function connect(provider: ConnectionProvider) {
    await provider.connect()
    setModalState({ isOpen: false, cancelled: false })
}

appMessageBus.on(Msgs.RequestDisplay, (screen) => {
    if (screen === ModalStates.Login) {
        setModalState({ isOpen: true, cancelled: false })
    }
})

export function ConnectModal() {
    const web3Providers = useInjectedProviders()
    const socialProviders = useSocialProviders()

    return (
        <>
            <main className="h-dvh w-screen rounded-xl overflow-hidden">
                <div
                    onClick={() => setModalState({ isOpen: false, cancelled: true })}
                    onKeyDown={() => setModalState({ isOpen: false, cancelled: true })}
                    className={clsx(
                        "fixed left-0 right-0 top-0 h-dvh",
                        "flex items-center justify-center",
                        "bg-slate-900/50 backdrop-blur-sm",
                        "transition duration-0 lg:duration-300 opacity-0 lg:opacity-100",
                    )}
                >
                    <div
                        className="flex gap-4 rounded-md bg-zinc-100 p-8"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <img alt="HappyChain Logo" src={happychainLogo} className="mx-auto h-24 w-24" />
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
