import { useHappyWallet } from "@happy.tech/react"
import { toast } from "sonner"
import { parseEther } from "viem"
import { walletClient } from "../clients"

const CallBatchDemo = () => {
    const { user } = useHappyWallet()
    async function getCapabilities() {
        try {
            const caps = await walletClient?.getCapabilities()
            toast.info("Check console for supported capabilities!")
            console.log({ caps })
        } catch (error) {
            console.error(error)
        }
    }

    async function sendBatch() {
        try {
            const batchCalls = await walletClient?.sendCalls({
                account: user?.address,
                calls: [
                    {
                        to: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
                        value: parseEther("0.001"),
                    },
                ],
            })
            console.log(batchCalls)
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <div className="grid grid-cols-2 gap-4 backdrop-blur-sm bg-gray-200/35 p-4 rounded-lg">
            <div className="text-lg font-bold col-span-2">EIP-5792</div>

            <button
                type="button"
                onClick={getCapabilities}
                className="rounded-lg bg-sky-300 p-2 shadow-xl font-mono truncate"
            >
                wallet_getCapabilities
            </button>

            <button
                type="button"
                onClick={sendBatch}
                className="rounded-lg bg-sky-300 p-2 shadow-xl text-center font-mono truncate"
            >
                wallet_sendCalls
            </button>
        </div>
    )
}

export default CallBatchDemo
