import { ProxyServer } from "@happy.tech/testing"
import { env } from "#lib/env"
import { proxyLogger } from "#lib/utils/logger"

export const proxyServer = new ProxyServer(env.ANVIL_PORT, env.PROXY_PORT, proxyLogger)
await proxyServer.start()
