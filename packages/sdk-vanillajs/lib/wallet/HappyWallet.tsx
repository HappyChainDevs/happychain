/** @jsxImportSource preact */
import { WalletFrame } from "./WalletFrame"
import { IsOpenContext, useSetupIsOpenContext } from "./context/IsOpenContext"
import { useWalletDragger } from "./hooks/useWalletDragger"
import cssStyles from "./styles.css?inline"
import { makeIframeUrl } from "./utils"

export interface HappyWalletProps {
    windowId: string
    chainId: string
    rpcUrl: string
}

/**
 * props are passed in as html attributes using kebab-case
 *
 * window-id = windowId
 * chain-id = chainId
 */
export const HappyWallet = ({ windowId, chainId, rpcUrl }: HappyWalletProps) => {
    const { isOpen, setIsOpen } = useSetupIsOpenContext()
    const { handleOffset, walletOffset, dragging, dragProps } = useWalletDragger()
    const iframeSrc = makeIframeUrl({ windowId, chainId, rpcUrl })

    if (!chainId || !windowId) {
        throw new Error("Misconfigured HappyWallet. ")
    }

    return (
        <>
            <style>{cssStyles}</style>
            <div
                data-open-state={isOpen}
                data-drag-state={dragging}
                style={{ "--happy-translate-y": `${handleOffset}px` }}
                className="wallet-container"
            >
                <IsOpenContext.Provider value={{ isOpen, setIsOpen }}>
                    <div
                        className={"wallet-frame-wrapper"}
                        style={{ "--wallet-offset-y": `${walletOffset}%` }}
                        {...dragProps}
                    >
                        <WalletFrame dragging={dragging} iframeSrc={iframeSrc} />
                    </div>
                </IsOpenContext.Provider>
            </div>
        </>
    )
}
