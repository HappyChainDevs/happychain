import useClients from "../useClients"

const CallBatchDemo = () => {
    const { walletClient } = useClients()

    async function getCapabilities() {
        // const caps = await walletClient?.getCapabilities()
    }

    async function sendBatch() {
        // const bundles = await walletClient?.sendCalls()
    }

    async function getCallsStatus() {
        // const stat = await walletClient?.getCallsStatus()
    }

    return (
        <div className="grid grid-cols-2 gap-4 backdrop-blur-sm bg-gray-200/35 p-4 rounded-lg">
            <div className="text-lg font-bold col-span-2">EIP-5792</div>

            <button type="button" onClick={getCapabilities} className="rounded-lg bg-sky-300 p-2 shadow-xl font-mono">
                wallet_getCapabilities
            </button>

            <button
                type="button"
                onClick={sendBatch}
                className="rounded-lg bg-sky-300 p-2 shadow-xl text-center font-mono"
            >
                wallet_sendCalls
            </button>

            <button type="button" onClick={getCallsStatus} className="rounded-lg bg-sky-300 p-2 shadow-xl font-mono">
                wallet_getCallsStatus
            </button>
        </div>
    )
}

export default CallBatchDemo
