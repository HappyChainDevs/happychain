import { ArrowLeft } from "@phosphor-icons/react"
import { useLocation, useNavigate } from "@tanstack/react-router"
import { useCallback, useState } from "react"
import { useContent } from "../../context/ContentContext"

const GlobalHeader = () => {
    const [showModal, setShowModal] = useState(false)

    const location = useLocation()
    const { sendInFlight, setSendInFlight } = useContent()
    const navigate = useNavigate()

    const handleBackButtonClick = useCallback(() => {
        if (sendInFlight) {
            // Show modal if a transaction is in flight
            setShowModal(true)
        } else {
            // Directly navigate to the embed route if there's no transaction
            navigate({ to: "/embed" })
        }
    }, [sendInFlight, navigate])

    const handleModalClose = () => {
        setShowModal(false)
        setSendInFlight(false)
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
            {showModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
                    <div className="modal-box">
                        <h3 className="font-bold text-lg">Transaction in Progress</h3>
                        <p className="py-4">
                            The transaction is being sent and won't be cancelled. You can check its status in the
                            History tab.
                        </p>
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
