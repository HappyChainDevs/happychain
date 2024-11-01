/** @jsxImportSource preact */
import { GripVerticalIcon } from "lucide-preact"
import { WalletFrame } from "./WalletFrame"
import { IsOpenContext, useSetupIsOpenContext } from "./context/IsOpenContext"
import { useWalletDragger } from "./hooks/useWalletDragger"
import cssStyles from "./styles.css?inline"
import { makeIframeSource } from "./utils"

export interface HappyWalletProps {
    windowId: string
    chain: string
    rpcUrl: string
}

export const HappyWallet = ({ windowId, chain, rpcUrl }: HappyWalletProps) => {
    const { isOpen, setIsOpen } = useSetupIsOpenContext()
    const { handleOffset, walletOffset, dragging, dragProps } = useWalletDragger()
    const iframeSrc = makeIframeSource({ windowId, chain, rpcUrl })

    return (
        <>
            <style>{cssStyles}</style>
            <div
                data-open-state={isOpen}
                data-drag-state={dragging}
                style={{ "--happy-translate-y": `${handleOffset}px` }}
                className="wallet-container"
            >
                <div className="wallet-grabber" {...dragProps}>
                    <IsOpenContext.Provider value={{ isOpen, setIsOpen }}>
                        <div className={"wallet-frame-wrapper"} style={{ "--wallet-offset-y": `${walletOffset}%` }}>
                            <WalletFrame dragging={dragging} iframeSrc={iframeSrc} />
                        </div>
                    </IsOpenContext.Provider>

                    <GripVerticalIcon className="wallet-grip" />
                </div>
            </div>
        </>
    )
}
