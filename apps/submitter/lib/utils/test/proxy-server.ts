import { ProxyServer } from "@happy.tech/testing"
import { type TestClient, createTestClient } from "viem"
import { env } from "../../env"
import { config } from "../clients"
import { proxyLogger } from "../logger"

export const proxyServer = new ProxyServer(env.ANVIL_PORT, env.PROXY_PORT, proxyLogger)
await proxyServer.start()

// for tests, we will enable automine, and for tests that require specific control
// they can disable automine, and use setTimeout, or setInterval, or the proxy service
// itself for more fine grained control over mining behaviour
export const testClient: TestClient = createTestClient({ ...config, mode: "anvil" })
await testClient.setAutomine(true)
