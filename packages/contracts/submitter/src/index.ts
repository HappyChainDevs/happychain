import { createPublicClient, createWalletClient } from "viem";
import dotenv from "dotenv";
import { createLogger } from "./logger";
import { createCustomTransport } from "./transport";
import { Server } from "./server";
import { RpcHandler } from "./rpc/handler";

dotenv.config();

const logger = createLogger();

// Initialize custom transport
const transport = createCustomTransport(process.env.RPC_URL || "http://localhost:8545", {
    logger,
    retryCount: 3,
    timeout: 10_000
});

// Initialize clients with custom transport
const publicClient = createPublicClient({
    transport
});

const walletClient = createWalletClient({
    transport
});

const entrypointAddress = process.env.HAPPY_ENTRYPOINT_ADDRESS as `0x${string}`;
if (!entrypointAddress) {
    throw new Error("HAPPY_ENTRYPOINT_ADDRESS not set in environment");
}

const rpcHandler = new RpcHandler({
    walletClient,
    publicClient,
    entrypointAddress,
    logger
});

const server = new Server({
    rpcHandler,
    logger,
    port: Number(process.env.PORT) || 3000
});

server.start();

// Handle graceful shutdown
process.on("SIGTERM", async () => {
    logger.info("Received SIGTERM signal, shutting down gracefully");
    await server.stop();
    process.exit(0);
});

process.on("SIGINT", async () => {
    logger.info("Received SIGINT signal, shutting down gracefully");
    await server.stop();
    process.exit(0);
});
