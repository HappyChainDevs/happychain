import { requestSessionKey } from "@happy.tech/core"
import { useHappyWallet } from "@happy.tech/react"
import { Spinner } from "@phosphor-icons/react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { publicClient, walletClient } from "../clients"
import { abis, deployment } from "../deployments"

const SessionKeyDemo = () => {
    const { user } = useHappyWallet()
    const [counter, setCounter] = useState<bigint | undefined>()
    const [loading, setLoading] = useState(false)

    const updateCounterValue = useCallback(async () => {
        if (!user?.address) {
            setCounter(undefined)
            return
        }
        const count = await publicClient.readContract({
            address: deployment.HappyCounter,
            abi: abis.HappyCounter,
            functionName: "getCount",
            account: user?.address,
        })
        setCounter(count)
        return count
    }, [user])

    useEffect(() => {
        setLoading(true)
        updateCounterValue().then(() => {
            setLoading(false)
        })
    }, [updateCounterValue])

    async function submitIncrement() {
        if (!walletClient || !user?.address) throw new Error("Wallet not connected")
        return await walletClient.writeContract({
            address: deployment.HappyCounter,
            abi: abis.HappyCounter,
            functionName: "increment",
        })
    }

    async function incrementCounter() {
        try {
            const hash = await submitIncrement()
            if (!hash) throw new Error("No hash returned")
            const receipt = await publicClient.waitForTransactionReceipt({ hash })
            if (receipt.status === "reverted") {
                toast.error("UserOp reverted!")
                return
            }

            const newCount = await updateCounterValue()
            toast.success(`Counter incremented to ${newCount}`)
        } catch (error) {
            console.warn("[incrementCounter] error:", error)
            toast.error("Failed to increment counter")
        }
    }

    async function addSessionKeyToCounterContract() {
        await requestSessionKey(deployment.HappyCounter)
        toast.success(
            // No period after the address, as that will most often flush to a next line given toast width.
            `Session Key will be used when interacting with ${deployment.HappyCounter} Try sending a transaction to the counter with the button below!`,
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

            <div className="col-span-2 text-center mt-2">
                <pre className="text-sm font-semibold">Current counter value</pre>
                {counter ? (
                    <div className="text-4xl font-bold">{counter.toString()}</div>
                ) : loading ? (
                    <Spinner className="animate-spin mx-auto" size="2.25rem" />
                ) : (
                    <div className="text-4xl font-bold">×</div>
                )}
            </div>
        </div>
    )
}

export default SessionKeyDemo
