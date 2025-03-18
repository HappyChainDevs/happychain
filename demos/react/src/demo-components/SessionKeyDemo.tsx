import { abis, deployment } from "@happy.tech/contracts/mocks/sepolia"
import { happyChainSepolia } from "@happy.tech/core"
import { useHappyChain } from "@happy.tech/react"
import { Spinner } from "@phosphor-icons/react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import useClients from "../useClients"

const SessionKeyDemo = () => {
    const { user, requestSessionKey } = useHappyChain()
    const { walletClient, publicClient } = useClients()
    const [counter, setCounter] = useState<bigint | undefined>()
    const [loading, setLoading] = useState(false)

    const getCounterValue = useCallback(async () => {
        if (!publicClient) throw new Error("Public client not initialized")

        return await publicClient.readContract({
            address: deployment.HappyCounter,
            abi: abis.HappyCounter,
            functionName: "getCount",
            account: user?.address,
        })
    }, [publicClient, user])

    // biome-ignore lint/correctness/useExhaustiveDependencies: missing counter by design
    useEffect(() => {
        if (!publicClient || !user) return
        setLoading(true)
        getCounterValue().then((value) => {
            if (!counter) setCounter(value)
            setLoading(false)
        })
    }, [user, publicClient, getCounterValue])

    async function submitIncrement() {
        if (!walletClient || !user?.address) throw new Error("Wallet not connected")
        return await walletClient.writeContract({
            address: deployment.HappyCounter,
            abi: abis.HappyCounter,
            functionName: "increment",
            chain: happyChainSepolia,
        })
    }

    async function incrementCounter() {
        try {
            const hash = await submitIncrement()
            if (!hash) return
            if (!publicClient) return

            const receipt = await publicClient.waitForTransactionReceipt({ hash })
            if (receipt.status === "reverted") {
                toast.error("UserOp reverted!")
                return
            }

            const newCount = await getCounterValue()
            setCounter(newCount)
            toast.success(`Counter incremented to ${newCount}`)
        } catch (error) {
            console.log("[incrementCounter] error:", error)
            toast.error("Failed to increment counter")
        }
    }

    async function addSessionKeyToCounterContract() {
        await requestSessionKey(deployment.HappyCounter)
        toast.success(
            `Session Key recorded successfully for ${deployment.HappyCounter}. Try sending a transaction to the counter with the button below!`,
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
