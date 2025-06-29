import "./telemetry/instrumentation"
import { fetchProxyCreationCode } from "#lib/handlers/createAccount/computeHappyAccountAddress"
import { sendAlert } from "#lib/utils/alert"
import { env } from "./env"
import { app } from "./server"
import { blockService, evmReceiptService, resyncAllAccounts } from "./services"

void blockService.start()
await blockService.waitForInitialization()
void evmReceiptService.start()
await resyncAllAccounts()
await fetchProxyCreationCode()
void sendAlert(`*Submitter has started* (Environment: ${env.NODE_ENV})`)

export { app }

// Bun will run the server using these parameters.
export default {
    port: env.APP_PORT,
    fetch: app.fetch,
}
