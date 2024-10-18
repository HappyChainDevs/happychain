import { ArrowLeft } from "@phosphor-icons/react"
import { useLocation, useNavigate } from "@tanstack/react-router"
import { getTxSendState } from "../../state/interfaceState"

const GlobalHeader = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const trackSend = getTxSendState()

    const handleBackButtonClick = () => {
        if (!trackSend) {
            // no tx send in progress
            navigate({ to: "/embed" })
        }
    }

    const handleModalClose = () => {
        navigate({ to: "/embed" })
    }

    return (
        <div className="relative flex items-center w-full p-1">
            {location.pathname !== "/embed" && (
                <button onClick={handleBackButtonClick} type="button">
                    <ArrowLeft weight="bold" className="absolute left-2 top-5" />
                </button>
            )}

            <span className="text-black text-xl py-2 mx-auto hidden lg:flex justify-center">🤠 HappyChain</span>

            {/* alert modal for user */}
            {trackSend === true && location.pathname === "/send" && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">Transaction in Progress</h3>
                        <p className="py-4">There is currently a sent transaction being included in a block.</p>
                        <div className="modal-action">
                            <button onClick={handleModalClose} className="btn btn-primary" type="button">
                                Okay
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default GlobalHeader
