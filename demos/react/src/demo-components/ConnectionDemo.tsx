import { ConnectButton, useHappyChain } from "@happy.tech/react"
import { toast } from "sonner"

const ConnectionDemo = () => {
    const { user, connect, disconnect } = useHappyChain()

    async function toggleUserConnection() {
        if (user) {
            disconnect()
            toast.info("User Disconnected from HappyWallet.")
        } else {
            connect()
            toast.info("User Connected to HappyWallet!")
        }
    }
    return (
        <div className="rounded-lg flex flex-col gap-4 p-4 backdrop-blur-sm bg-gray-200/35 col-span-2">
            <div className="text-lg font-bold">Connection Methods</div>

            <div className="flex gap-4">
                <div className="flex flex-col h-full justify-between">
                    <button
                        type="button"
                        onClick={toggleUserConnection}
                        className="rounded-lg bg-sky-300 p-2 shadow-xl"
                    >
                        {user ? "Disconnect" : "Connect"}
                    </button>
                    <small>Custom Button</small>
                </div>

                <span className="border border-gray-200/35" />

                <div className="flex flex-col h-full justify-between">
                    <ConnectButton />
                    <small>Default Badge</small>
                </div>
            </div>
        </div>
    )
}

export default ConnectionDemo
