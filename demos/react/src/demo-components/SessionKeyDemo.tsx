import { loadAbi } from "@happy.tech/core"
import { getCurrentUser, requestSessionKey } from "@happy.tech/core"
import { useHappyWallet } from "@happy.tech/react"
import { SpinnerIcon } from "@phosphor-icons/react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import type { Address } from "viem"
import { publicClient, walletClient } from "../clients"
import { abis, deployment } from "../deployments"

function useCounter() {
    const [counter, setCounter] = useState<bigint | undefined>()
    const [isLoading, setLoading] = useState(false)
    const { user } = useHappyWallet()

    const refetch = useCallback(async (account: Address) => {
        const count = await publicClient.readContract({
            address: deployment.HappyCounter,
            abi: abis.HappyCounter,
            functionName: "getCount",
            account,
        })
        setCounter(count)
        return count
    }, [])

    // Sync counter value with current active user
    useEffect(() => {
        setLoading(true)
        const updateCounterValue = async () => {
            if (!user?.address) return setCounter(undefined)
            await refetch(user?.address)
        }

        updateCounterValue().finally(() => {
            setLoading(false)
        })
    }, [user, refetch])

    return {
        isLoading,
        counter,
        refetch,
    }
}

const SessionKeyDemo = () => {
    const { counter, isLoading, refetch } = useCounter()

    async function incrementCounter() {
        let _count = counter || 0n
        try {
            const hash = await walletClient.writeContract({
                address: deployment.HappyCounter,
                abi: abis.HappyCounter,
                functionName: "increment",
            })

            if (!hash) throw new Error("No hash returned")

            setCounter((count) => {
                _count = (count || 0n) + 1n
                return _count
            })
            const receipt = await publicClient.waitForTransactionReceipt({ hash })

            if (receipt.status === "reverted") {
                toast.error("Boop reverted!")
                return
            }

            const next = await refetch(getCurrentUser()!.address)
            toast.success(`Counter incremented to ${next}`)
        } catch (error) {
            console.warn("[incrementCounter] error:", error)
            toast.error("Failed to increment counter: " + (error instanceof Error ? error.message : "Unknown error"))
        }
    }
    async function resetCounter() {
        try {
            const hash = await walletClient.writeContract({
                address: deployment.HappyCounter,
                abi: abis.HappyCounter,
                functionName: "reset",
            })

            const receipt = await publicClient.waitForTransactionReceipt({ hash })
            if (receipt.status === "reverted") {
                toast.error("Boop reverted!")
                return
            }

            const newCount = await refetch(getCurrentUser()!.address)
            toast.success(`Counter incremented to ${newCount}`)
        } catch (error) {
            setCounter((count) => (_count === counter || !_count ? count : _count - 1n))
            console.warn("[incrementCounter] error:", error)
            toast.error("Failed to reset counter: " + (error instanceof Error ? error.message : "Unknown error"))
        }
    }

    async function loadAbiStub() {
        await loadAbi(deployment.HappyCounter, abis.HappyCounter)
        toast.success(
            `ABI loaded for ${deployment.HappyCounter}! Click on the Counter ++ button to see the ABI in use within the request popup (Assuming you haven't enabled session keys yet).`,
        )
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

            <button type="button" onClick={loadAbiStub} className="rounded-lg bg-sky-300 p-2 shadow-xl">
                Load ABI
            </button>

            <button type="button" onClick={resetCounter} className="rounded-lg bg-sky-300 p-2 shadow-xl">
                Reset
            </button>

            <button type="button" onClick={incrementCounter} className="rounded-lg bg-sky-300 p-2 shadow-xl">
                Counter ++
            </button>

            <div className="col-span-2 text-center mt-2">
                <pre className="text-sm font-semibold">Current counter value</pre>
                {counter !== undefined ? (
                    <div className="text-4xl font-bold">{counter.toString()}</div>
                ) : isLoading ? (
                    <SpinnerIcon className="animate-spin mx-auto" size="2.25rem" />
                ) : (
                    <div className="text-4xl font-bold">×</div>
                )}
            </div>
        </div>
    )
}

export default SessionKeyDemo
