import { requestSessionKey, revokeSessionKey } from "@happy.tech/core"
import { KeyIcon, TrashIcon } from "@phosphor-icons/react"
import { toast } from "sonner"
import { deployment } from "../deployments"

export const SessionKeyDemo = () => {
    async function addCounterSessionKey() {
        try {
            await requestSessionKey(deployment.HappyCounter)
            toast.success(
                <div>
                    From now one the Session Key will be used when interacting with the Counter contract:
                    <pre>{deployment.HappyCounter}</pre>
                    Try incrementing with Counter ++
                </div>,
            )
        } catch (err) {
            toast.error("Error requesting session key for Counter contract")
            console.error(err)
        }
    }

    async function addTokenSessionKey() {
        try {
            await requestSessionKey(deployment.MockTokenA)
            toast.success(
                <div>
                    From now one the Session Key will be used when interacting with the Token contract:
                    <pre>{deployment.MockTokenA}</pre>
                    Try minting some tokens!
                </div>,
            )
        } catch (err) {
            toast.error("Error requesting session key for Token contract")
            console.error(err)
        }
    }

    async function revokeCounterSessionKey() {
        try {
            await revokeSessionKey(deployment.HappyCounter)
            toast.success("Counter session key revoked")
        } catch (error) {
            toast.error("Error revoking session key")
            console.error(error)
        }
    }

    async function revokeTokenSessionKey() {
        try {
            await revokeSessionKey(deployment.MockTokenA)
            toast.success("Token session key revoked")
        } catch (error) {
            toast.error("Error revoking session key")
            console.error(error)
        }
    }

    return (
        <div className="flex flex-col gap-4 backdrop-blur-sm bg-gray-200/35 p-4 rounded-lg">
            <div className="text-lg font-bold col-span-2">Session Key Management</div>

            <div className="grid sm:grid-cols-2 gap-4">
                <button
                    type="button"
                    onClick={addCounterSessionKey}
                    className="rounded-lg bg-sky-300 p-2 shadow-xl flex gap-2 items-center"
                >
                    <KeyIcon />
                    Add Counter Key
                </button>

                <button
                    type="button"
                    onClick={addTokenSessionKey}
                    className="rounded-lg bg-sky-300 p-2 shadow-xl flex gap-2 items-center"
                >
                    <KeyIcon />
                    Add Token Key
                </button>

                <button
                    type="button"
                    className="rounded-lg bg-orange-300 p-2 shadow-xl flex gap-2 items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={revokeCounterSessionKey}
                >
                    <TrashIcon />
                    Remove Counter Key
                </button>

                <button
                    type="button"
                    className="rounded-lg bg-orange-300 p-2 shadow-xl flex gap-2 items-center disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={revokeTokenSessionKey}
                >
                    <TrashIcon />
                    Remove Token Key
                </button>
            </div>
        </div>
    )
}
