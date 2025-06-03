import { ProxyServer } from "@happy.tech/testing"
import { type TestClient, createTestClient } from "viem"
import { env } from "../../env"
import { config } from "../clients"
import { proxyLogger } from "../logger"

export const proxyServer = new ProxyServer(env.ANVIL_PORT, env.PROXY_PORT, proxyLogger)
await proxyServer.start()

export const testClient: TestClient = createTestClient({ ...config, mode: "anvil" })

// We enable automine or interval mining depending on the vaue of env.AUTOMINE_TESTS.
// With Anvil, it is possibly to dynamically switch between those as well, a capability we use in some tests.
if (env.AUTOMINE_TESTS) await testClient.setAutomine(true)
else await testClient.setIntervalMining({ interval: 2 })
