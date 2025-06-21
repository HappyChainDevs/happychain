import { connect, getCurrentUser } from "@happy.tech/core"
import { useHappyWallet } from "@happy.tech/react"
import { ArrowCounterClockwiseIcon, CalculatorIcon, CoinsIcon, SpinnerIcon } from "@phosphor-icons/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { type Root, createRoot } from "react-dom/client"
import { toast } from "sonner"
import { type Address, formatUnits } from "viem"
import { publicClient, walletClient } from "../clients"
import { abis, deployment } from "../deployments"

export const ContractInteractionDemo = () => {
    const { count, isLoading, increment, reset } = useCounterActions()
    const { mint } = useTestTokenActions()

    return (
        <div className="flex flex-col gap-4 backdrop-blur-sm bg-gray-200/35 p-4 rounded-lg">
            <div className="text-lg font-bold col-span-2">Contract Interactions</div>

            <div className="grid sm:grid-cols-2 gap-4">
                <button
                    type="button"
                    onClick={increment}
                    className="rounded-lg bg-sky-300 p-2 shadow-xl flex items-center gap-2"
                >
                    <CalculatorIcon />
                    Counter ++
                </button>

                <button
                    type="button"
                    onClick={mint}
                    className="rounded-lg bg-sky-300 p-2 shadow-xl flex items-center gap-2"
                >
                    <CoinsIcon />
                    Mint Token
                </button>

                <button
                    type="button"
                    onClick={reset}
                    className="rounded-lg bg-orange-300 p-2 shadow-xl flex items-center gap-2"
                >
                    <ArrowCounterClockwiseIcon />
                    Reset Counter
                </button>
            </div>

            {/* Counter Display */}
            <div className="col-span-2 text-center mt-2">
                <pre className="text-sm font-semibold">Current counter value</pre>
                {count !== undefined ? (
                    <div className="text-4xl font-bold">{count.toString()}</div>
                ) : isLoading ? (
                    <SpinnerIcon className="animate-spin mx-auto" size="2.25rem" />
                ) : (
                    <div className="text-4xl font-bold">×</div>
                )}
            </div>
        </div>
    )
}

function useCounterActions() {
    const { user } = useHappyWallet()
    const countRef = useRef<bigint | undefined>(undefined)
    const [count, setCount_] = useState<bigint | undefined>()
    const [isLoading, setLoading] = useState(false) // initial load
    const txsSent = useRef(0)
    const txsSettled = useRef(0)
    const timeout = useRef<NodeJS.Timeout | undefined>(undefined)
    const spinner = useRef<HTMLDivElement | null>(null)
    const spinnerRoot = useRef<Root | null>(null)

    const setCount = useCallback((count_: bigint | undefined) => {
        countRef.current = count_
        setCount_(count_)
    }, [])

    const refetch = useCallback(
        async (account: Address) => {
            const onchainCount = await publicClient.readContract({
                address: deployment.HappyCounter,
                abi: abis.HappyCounter,
                functionName: "getCount",
                account,
            })
            if (onchainCount > (countRef.current ?? 0n)) setCount(onchainCount)
            return onchainCount
        },
        [setCount],
    )

    // Sync counter value with current active user
    useEffect(() => {
        setLoading(true)
        const updateCounterValue = async () => {
            if (!user?.address) return setCount(undefined)
            await refetch(user?.address)
        }

        updateCounterValue().finally(() => setLoading(false))
    }, [user, refetch, setCount])

    async function increment() {
        try {
            updateInFlightSpinner()
            const hash = await walletClient.writeContract({
                address: deployment.HappyCounter,
                abi: abis.HappyCounter,
                functionName: "increment",
            })
            if (!hash) throw new Error("No hash returned")

            const receipt = await publicClient.waitForTransactionReceipt({ hash })
            if (receipt.status === "reverted") {
                toast.error("Boop reverted!")
                return
            }

            if (countRef.current) setCount(countRef.current + 1n)
            toast.success(`Counter incremented to ${countRef.current}`)
            void refetch(getCurrentUser()!.address)
        } catch {
            toast.error("Failed to increment counter")
        } finally {
            txsSettled.current++
            updateInFlightSpinner()
        }
    }
    async function reset() {
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

            setCount(0n)
            toast.success("Counter reset to 0")
            void refetch(getCurrentUser()!.address)
        } catch {
            toast.error("Failed to reset counter")
        }
    }

    function updateInFlightSpinner() {
        function showSpinner() {
            if (spinner.current) return
            spinner.current = document.createElement("div")
            document.body.appendChild(spinner.current)
            spinnerRoot.current = createRoot(spinner.current)
            spinnerRoot.current.render(
                <div className="fixed bottom-4 left-4 pointer-events-none">
                    <div className="backdrop-blur-sm bg-gray-200/35 p-4 rounded-xl">
                        <SpinnerIcon className="animate-spin mx-auto" size="2.25rem" />
                    </div>
                </div>,
            )
        }

        function hideSpinner() {
            if (!spinner.current || !spinnerRoot.current) return
            spinnerRoot.current.unmount()
            document.body.removeChild(spinner.current)
            spinnerRoot.current = null
            spinner.current = null
        }

        clearTimeout(timeout.current)
        if (txsSent.current > txsSettled.current) {
            showSpinner()
            timeout.current = setTimeout(() => hideSpinner, 15_000)
        } else {
            console.log("hiding")
            hideSpinner()
        }
    }

    return {
        isLoading,
        count,
        refetch,
        increment,
        reset,
    }
}

function useTestTokenActions() {
    const { user } = useHappyWallet()

    /** mints 1 MTA token to the connected account */
    async function mint() {
        try {
            const qty = 1000000000000000000n
            // For many calls we can rely on the wallet to handle automatically prompting the user to
            // connect if required, however this call requires the users address to be known ahead
            // of time so it can be provided to 'args'. In this case we must manually call connect()
            // to ensure there is a user connected to the wallet, and in args, we may call
            // `getCurrentUser()` to get the address without waiting for react to re-render.
            if (!user?.address) await connect()
            const writeCallResult = await walletClient.writeContract({
                address: deployment.MockTokenA,
                abi: abis.MockTokenA,
                functionName: "mint",
                args: [getCurrentUser()!.address, qty],
            })
            if (writeCallResult) {
                console.log("[mintTokens] success! Boop:", writeCallResult)
                const num = formatUnits(qty, 18)
                toast.success(
                    <div>
                        {num} Token{Number(num) > 1 ? "s" : ""} minted successfully!
                    </div>,
                )
            } else {
                console.log("[mintTokens] failed; please try again!")
                toast.error("Something went wrong, please try again!")
            }
        } catch (error) {
            console.log("[mintTokens] error caught:", error)
            toast.error("Something went wrong, please try again!")
        }
    }

    return { mint }
}
