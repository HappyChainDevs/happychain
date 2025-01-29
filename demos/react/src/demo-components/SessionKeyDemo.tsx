import { abis, deployment } from "@happychain/contracts/mocks/sepolia"
import { happyChainSepolia, useHappyChain } from "@happychain/react"
import { toast } from "sonner"
import useClients from "../useClients"

const SessionKeyDemo = () => {
    const { user, requestSessionKey } = useHappyChain()
    const { walletClient, publicClient } = useClients()

    async function getCounterValue() {
        if (!publicClient) throw new Error("Public client not initialized")

        return publicClient.readContract({
            address: deployment.HappyCounter,
            abi: abis.HappyCounter,
            functionName: "getCount",
        })
    }

    async function submitIncrement() {
        if (!walletClient || !user?.address) throw new Error("Wallet not connected")

        const [account] = await walletClient.getAddresses()
        return walletClient.writeContract({
            account,
            address: deployment.HappyCounter,
            abi: abis.HappyCounter,
            functionName: "increment",
            chain: happyChainSepolia,
        })
    }

    async function incrementCounter() {
        try {
            // Get initial count
            const initialCount = await getCounterValue()

            // Submit and wait for transaction
            const hash = await submitIncrement()

            if (hash) {
                toast.info("UserOp submitted successfully!", {
                    duration: Number.POSITIVE_INFINITY,
                    closeButton: true,
                    action: (
                        <a
                            className="text-info hover:text-primary/50 underline"
                            target="_blank"
                            rel="noreferrer"
                            href={`https://happy-testnet-sepolia.explorer.caldera.xyz/op/${hash}`}
                        >
                            (explorer)
                        </a>
                    ),
                })

                if (!publicClient) return

                // Wait for receipt and check status
                const receipt = await publicClient.waitForTransactionReceipt({ hash })
                if (receipt.status === "reverted") {
                    toast.error("UserOp reverted!")
                    return
                }

                // Get final count and show success message
                const newCount = await getCounterValue()
                toast.success(`Counter incremented from ${initialCount} to ${newCount} :)`)
            }
        } catch (error) {
            console.log("[incrementCounter] error:", error)
            toast.error("Failed to increment counter")
        }
    }

    async function addSessionKeyToCounterContract() {
        await requestSessionKey(deployment.HappyCounter)
        toast.success(
            `Session Key recorded successfuly for ${deployment.HappyCounter}. Try sending a transaction to the counter with the button below!`,
        )
    }

    return (
        <div className="grid grid-cols-2 gap-4 backdrop-blur-sm bg-gray-200/35 p-4 rounded-lg">
            <div className="text-lg font-bold col-span-2">Session Keys Functionality</div>
            <button
                type="button"
                onClick={addSessionKeyToCounterContract}
                className="rounded-lg bg-sky-300 p-2 shadow-xl"
            >
                Add Session Key
            </button>

            <button type="button" onClick={incrementCounter} className="rounded-lg bg-sky-300 p-2 shadow-xl">
                Counter ++
            </button>
        </div>
    )
}

export default SessionKeyDemo
