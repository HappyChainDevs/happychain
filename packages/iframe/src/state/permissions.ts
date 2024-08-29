import { atomWithStorage, createJSONStorage } from "jotai/utils"
import { getDefaultStore } from "jotai/vanilla"
import { dappMessageBus, happyProviderBus } from "../services/eventBus"
import { providerAtom } from "../services/provider"
import { userAtom } from "./user"

type PermissionMap = Map<string, Map<string, unknown>>

const mapStorage = createJSONStorage<PermissionMap>(
    // getStringStorage
    () => localStorage, // or sessionStorage, asyncStorage or alike
    // options (optional)
    {
        replacer: (_key, value) => {
            try {
                if (value instanceof Map) {
                    return {
                        dataType: "Map",
                        value: Array.from(value.entries()), // or with spread: value: [...value]
                    }
                }
            } catch {
                console.error("error in replacer")
            }

            return value
        }, // optional reviver option for JSON.parse
        reviver: (_key, value) => {
            try {
                if (typeof value === "object" && value !== null && "dataType" in value && "value" in value) {
                    if (value.dataType === "Map" && Array.isArray(value.value)) {
                        return new Map(value.value)
                    }
                    if (value.dataType === "Map") {
                        console.warn("EMPTY MAP?", value)
                        return new Map()
                    }
                }
            } catch {
                console.error("error in reviver")
            }

            return value
        }, // optional replacer option for JSON.stringify
    },
)

// [url, [permissionsMap]]
const permissionsAtom = atomWithStorage<PermissionMap>("user_permissions_per_domain", new Map(), mapStorage, {
    getOnInit: true,
})

const store = getDefaultStore()

function hasPermission({ method, params }: { method: string; params: { [key: string]: unknown }[] }) {
    const referrer = store.get(permissionsAtom).get(document.referrer)
    if (!referrer) {
        return false
    }
    if (["eth_requestAccounts", "eth_accounts"].includes(method)) {
        return referrer.has("eth_accounts")
    }
    if (method === "wallet_requestPermissions") {
        if (!params.length) {
            // empty params object... revoke permissions?
            return false
        }
        return params.every((param) => {
            const [[name]] = Object.entries(param)
            return referrer.has(name)
        })
    }

    return false
}
function setPermission({ method, params }: { method: string; params: { [key: string]: unknown }[] }) {
    console.log("SETTING PERMISSIONS")
    try {
        const referrer = store.get(permissionsAtom)?.get(document.referrer) ?? new Map()

        if (method === "eth_requestAccounts") {
            // store permissions for future
            referrer.set("eth_accounts", {})

            // allow dapp to access user
            dappMessageBus.emit("auth-changed", store.get(userAtom))
        }

        if (method === "wallet_requestPermissions") {
            for (const param of params) {
                const [[name]] = Object.entries(param)
                referrer.set(name, {})
                if (name === "eth_accounts") {
                    // allow dapp to access user
                    dappMessageBus.emit("auth-changed", store.get(userAtom))
                }
            }
        }
        store.set(permissionsAtom, (prev) => prev.set(document.referrer, referrer))
    } catch (e) {
        console.log({ e })
    }
}

function getPermissions({ method, params }: { method: string; params: { [key: string]: unknown }[] }) {
    const referrer = store.get(permissionsAtom).get(document.referrer)

    if (!referrer) {
        return []
    }

    if (method === "wallet_requestPermissions") {
        const perms: unknown[] = []
        for (const param of params) {
            const [[name]] = Object.entries(param)
            if (referrer.has(name)) {
                perms.push({ parentCapability: name })
            }
            return perms
        }
        return perms
    }

    return []
}

function revokePermission({ method, params }: { method: string; params: { [key: string]: unknown }[] }) {
    console.warn("REVOKING PERMISSIONS", method, params)
    const referrer = store.get(permissionsAtom).get(document.referrer)
    console.log({ referrer })
    if (!referrer) {
        return
    }

    if (method === "wallet_revokePermissions") {
        console.log("deleting...")
        for (const param of params) {
            console.log({ param })
            const [[name]] = Object.entries(param)
            console.log({ name })
            referrer.delete(name)
            if (name === "eth_accounts") {
                // allow dapp to access user
                console.log("clearing user...")
                dappMessageBus.emit("auth-changed", undefined)
                happyProviderBus.emit("provider:event", { payload: { event: "accountsChanged", args: [] } })
            }
        }
    }

    store.set(permissionsAtom, (prev) => {
        if (referrer.size) {
            prev.set(document.referrer, referrer)
            return prev
        }

        prev.delete(document.referrer)
        return prev
    })
}

function clearPermissions() {
    store.set(permissionsAtom, (prev) => {
        prev.delete(document.referrer)
        dappMessageBus.emit("auth-changed", undefined)
        happyProviderBus.emit("provider:event", { payload: { event: "accountsChanged", args: [] } })
        return prev
    })
}

export { hasPermission, getPermissions, revokePermission, setPermission, clearPermissions }
