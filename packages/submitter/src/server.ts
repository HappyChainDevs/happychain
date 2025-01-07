import Fastify, { type FastifyInstance } from "fastify"
import cors from "@fastify/cors"
import { fromZodError } from "zod-validation-error"
import { type JSONRPCResponse, RpcError, jsonRpcSchema } from "./types/rpc"
import type { IRpcHandler } from "./rpc/handler"
import { Logger } from "./logger"

declare module "fastify" {
    interface FastifyRequest {
        rpcMethod: string
    }
}

export class Server {
    private fastify: FastifyInstance
    private rpcHandler: IRpcHandler
    private logger: Logger

    constructor({
        rpcHandler,
        logger,
        port = 3000
    }: {
        rpcHandler: IRpcHandler
        logger: Logger
        port?: number
    }) {
        this.rpcHandler = rpcHandler
        this.logger = logger

        this.fastify = Fastify({
            logger: logger as any,
            requestTimeout: 30_000,
            disableRequestLogging: true
        })

        this.fastify.register(cors, {
            origin: "*",
            methods: ["POST", "GET", "OPTIONS"]
        })

        this.fastify.decorateRequest("rpcMethod", null)

        this.fastify.post("/", this.handleRpc.bind(this))
        this.fastify.get("/health", async (_, reply) => {
            await reply.status(200).send("OK")
        })
    }

    public start(): void {
        this.fastify.listen({ port: 3000, host: "0.0.0.0" })
    }

    public async stop(): Promise<void> {
        await this.fastify.close()
    }

    private async handleRpc(request: any, reply: any): Promise<void> {
        let requestId: number | null = null

        try {
            const contentTypeHeader = request.headers["content-type"]
            if (contentTypeHeader !== "application/json") {
                throw new RpcError(
                    "invalid content-type, must be application/json",
                    -32700
                )
            }

            const jsonRpcParsing = jsonRpcSchema.safeParse(request.body)
            if (!jsonRpcParsing.success) {
                const validationError = fromZodError(jsonRpcParsing.error)
                throw new RpcError(
                    `invalid JSON-RPC request: ${validationError.message}`,
                    -32700
                )
            }

            const jsonRpcRequest = jsonRpcParsing.data
            requestId = jsonRpcRequest.id

            request.rpcMethod = jsonRpcRequest.method
            this.logger.info(
                {
                    method: jsonRpcRequest.method,
                    params: jsonRpcRequest.params
                },
                "incoming request"
            )

            const result = await this.rpcHandler.handleMethod(
                jsonRpcRequest.method,
                jsonRpcRequest.params || []
            )

            const response: JSONRPCResponse = {
                jsonrpc: "2.0",
                id: requestId,
                result: result.result
            }

            await reply.status(200).send(response)
            this.logger.info({ response }, "sent reply")

        } catch (err) {
            if (err instanceof RpcError) {
                const rpcError = {
                    jsonrpc: "2.0",
                    id: requestId,
                    error: {
                        message: err.message,
                        code: err.code,
                        data: err.data
                    }
                }
                await reply.status(200).send(rpcError)
                this.logger.info({ error: rpcError }, "error reply")
            } else if (err instanceof Error) {
                const rpcError = {
                    jsonrpc: "2.0",
                    id: requestId,
                    error: {
                        message: err.message,
                        code: -32603
                    }
                }
                await reply.status(500).send(rpcError)
                this.logger.error({ error: err }, "error reply (non-rpc)")
            } else {
                const rpcError = {
                    jsonrpc: "2.0",
                    id: requestId,
                    error: {
                        message: "Unknown error",
                        code: -32603
                    }
                }
                await reply.status(500).send(rpcError)
                this.logger.error({ error: err }, "error reply (unknown)")
            }
        }
    }
}
