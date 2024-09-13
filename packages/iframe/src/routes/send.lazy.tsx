import { Msgs } from "@happychain/sdk-shared"
import { ModalStates } from "@happychain/sdk-shared/lib/interfaces/events"
import { House } from "@phosphor-icons/react"
import { Link, createLazyFileRoute, useLocation } from "@tanstack/react-router"
import { useAtomValue } from "jotai"
import { useState } from "react"
import { ConnectButton } from "../components/ConnectButton"
import AddressSelector from "../components/interface/send-tx/AddressSelector"
import SendTransactionSummary from "../components/interface/send-tx/SendTransactionSummary"
import { appMessageBus } from "../services/eventBus"
import { userAtom } from "../state/user"

export const Route = createLazyFileRoute("/send")({
    component: Send,
})

function open() {
    void appMessageBus.emit(Msgs.ModalToggle, true)
}

appMessageBus.on(Msgs.RequestDisplay, (screen) => {
    if (screen === ModalStates.SEND) {
        console.log("listening for send in send")
        open()
    }
})

/**
 * components:
 * - to address - input field (checker for valid address)
 * - assume since only one address now, don't have to show more
 * - token selector - demo with $happy and wagmi call
 * - on token select: take in amount, handle balance drama, how to show
 *   incorrect balance input
 *
 * - action buttons:
 * -- cancel button: back to /embed
 * -- continue: goes to confirm screen to show tx details
 *
 * - confirm screen:
 * -- sending x token: how much
 * -- details:
 * --- estimated gas fee (wagmi)
 * --- iff happy: amount + gas fee
 *
 * -- reject button: back to /embed
 * -- accept button: back to /embed showing loading status of tx,
 *    should move to the history tab?
 */

function Send() {
    const user = useAtomValue(userAtom)

    const [value, setValue] = useState<string | undefined>(undefined)

    /**
     * Handles the change event for the input field.
     * Validates numeric input and updates the state accordingly.
     * @param event The change event.
     */
    const handleTokenBalanceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = event.target.value
        // Validate numeric input
        if (/^\d*\.?\d*$/.test(inputValue)) {
            setValue(inputValue)
            // if (
            //   selectedToken &&
            //   parseFloat(inputValue) > parseFloat(selectedToken.balance)
            // ) {
            //   setValidValue(false);
            // } else {
            //   setValidValue(true);
            // }
        }
    }

    if (!user) {
        return <ConnectButton />
    }

    return (
        <>
            <main className="flex h-screen w-screen items-stretch rounded-xl overflow-hidden">
                <div className="w-full h-full transition flex-col  border border-black bg-base-200 items-center justify-start flex">
                    {/* biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
                    <div className="flex items-center justify-center gap-2 p-1 lg:hidden w-full h-full" onClick={open}>
                        <img src={user.avatar} alt={`${user.name}'s avatar`} className="h-8 rounded-full" />
                        <p className="">{user?.ens || user?.email || user?.name}</p>
                    </div>

                    <div className="flex flex-row items-center justify-between h-12 w-full px-2">
                        <span className="text-black text-xl py-2 hidden lg:flex justify-center">🤠 HappyChain</span>

                        {/* go back to home view */}
                        <Link to={"/embed"}>
                            <House size={22} />
                        </Link>
                    </div>

                    <AddressSelector />

                    {/* token send details: balance, max button, input field, token selector */}
                    <div className="flex flex-col items-center justify-center h-[80px] w-full border-slate-700 border-t border-b my-3 px-3">
                        <div className="flex flex-row h-[60px] w-full items-center justify-between">
                            <p className="text-[18px]">$HAPPY</p>

                            <div className="flex flex-row w-[30%] items-center justify-end space-x-1">
                                {/* @todo tooltip */}
                                <div className={`${value ?? "tooltip"}`} data-tip={value}>
                                    <input
                                        className="w-[70px] h-[30px] text-[20px] px-2 text-slate-600 placeholder:text-[20px] placeholder:text-slate-600"
                                        placeholder=""
                                        value={value || ""}
                                        onChange={handleTokenBalanceChange}
                                    />
                                </div>

                                <p className="text-[14px]">HAPPY</p>
                            </div>
                        </div>
                        {/* <div className="flex flex-row h-[10px] w-full px-2">
              <p>Balance</p>
            </div> */}
                    </div>

                    {/* transaction summary */}

                    <SendTransactionSummary />
                </div>
            </main>
        </>
    )
}
