import { abis, deployment } from "@happy.tech/contracts/mocks/sepolia"
import { happyChainSepolia } from "@happy.tech/core"
import { useHappyChain } from "@happy.tech/react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import useClients from "../useClients"

const SessionKeyDemo = () => {
    const { user, requestSessionKey } = useHappyChain()
    const { walletClient, publicClient } = useClients()
    const [counter, setCounter] = useState<bigint>(0n)

    async function getCounterValue() {
        if (!publicClient) throw new Error("Public client not initialized")

        return publicClient.readContract({
            address: deployment.HappyCounter,
            abi: abis.HappyCounter,
            functionName: "getCount",
            account: user?.address,
        }) as Promise<bigint>
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

                const receipt = await publicClient.waitForTransactionReceipt({ hash })
                if (receipt.status === "reverted") {
                    toast.error("UserOp reverted!")
                    return
                }

                const newCount = await getCounterValue()
                setCounter(newCount)
                toast.success(`Counter incremented to ${newCount}`)
            }
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

    // initial setup for counter display value
    // biome-ignore lint/correctness/useExhaustiveDependencies: infinite re-render
    useEffect(() => {
        async function fetchCounter() {
            const count = await getCounterValue()
            setCounter(count)
        }
        fetchCounter()
    }, [])

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
                <div className="text-4xl font-bold">{counter.toString()}</div>
            </div>
        </div>
    )
}

export default SessionKeyDemo
