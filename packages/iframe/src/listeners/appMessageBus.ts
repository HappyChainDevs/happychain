import { Msgs } from "@happychain/sdk-shared"
import { appMessageBus } from "../services/eventBus"
import { grantPermissions, revokePermissions } from "../services/permissions"
import { getDappOrigin } from "../utils/getDappOrigin"

// Request App Origin Update on load
appMessageBus.emit(Msgs.OriginRequest, undefined)

// Whenever the app makes a permissions request to the injected wallet, it will also
// forward the request and response to the iframe so that we can mirror the permission.
appMessageBus.on(Msgs.MirrorPermissions, ({ request, response }) => {
    console.log("***********************************")
    console.log({ request, response })
    const hasResponse = Array.isArray(response) && response.length
    switch (request.method) {
        case "eth_accounts":
        case "eth_requestAccounts":
            // Revoke the eth_accounts permission if the response is empty.
            // biome-ignore format: readability
            hasResponse
                      ? grantPermissions("eth_accounts", { origin: getDappOrigin() })
                      : revokePermissions("eth_accounts", { origin: getDappOrigin() })
            return

        case "wallet_requestPermissions":
            // We only handle the eth_accounts permission for now, but there is no harm in
            // setting the permissions that the user has authorized, since we either will be
            // more permissive (e.g. allow methods only on the basis of eth_accounts and
            // user approval) or do not support the capability the permission relates to.
            hasResponse && grantPermissions(request.params[0], { origin: getDappOrigin() })
            return

        case "wallet_revokePermissions":
            request.params && revokePermissions(request.params[0], { origin: getDappOrigin() })
            return
    }
})
