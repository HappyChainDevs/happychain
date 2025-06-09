import { type ChildProcess, execSync, spawn } from "node:child_process"
import {
    http,
    type Account,
    type PublicClient,
    type TestClient,
    type Transport,
    type WalletClient,
    createPublicClient,
    createTestClient,
    createWalletClient,
    webSocket,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { anvil } from "viem/chains"
import { With } from "./utils/classes"
import { tryCatch, tryCatchAsyncU, tryCatchU } from "./utils/error"
import { LogLevel, Logger, type TaggedLogger } from "./utils/logger"
import { waitForCondition } from "./utils/promises"

export interface AnvilParams {
    // Host Anvil will bind to, defaults to 127.0.0.1
    host?: string
    // Port Anvil will bind to, default to 8545
    port?: number
    // URL used to send messages to Anvil, defaults to <protocol>://<host>:<port>
    url?: string
    // Protocol of the URL (http, ws, https, wss), defaults to "http"
    protocol?: "http" | "ws" | "https" | "wss"
    // Block time, defaults to 2s — this can be changed during execution but this is the default to return to
    blockTime: number
    // Account in use by the wallet client, defaults to the first Anvil private key
    account?: Account
    // Logger, default to no logs
    logger?: TaggedLogger
    // Extra CLI args to pass to anvil
    extraCliArgs?: string[]
    // A predicate on whether to pass stdout output to the logger. Defaults to no logs.
    stdoutFilter?: (output: string) => boolean
    // A predicate on whether to pass stderr output to the logger. Defaults to no logs.
    stderrFilter?: (output: string) => boolean
    // A sink for stdout output. If specified, takes precedence over {@link stdoutFilter}. Default unspecified.
    stdoutHandler?: ((output: string) => unknown) | null
    // A sink for stderr output. If specified, takes precedence over {@link stderrFilter}. Default unspecified.
    stderrHandler?: ((output: string) => unknown) | null
}

export class Anvil extends With<Required<AnvilParams>>() implements Readonly<Required<AnvilParams>> {
    readonly test: TestClient<"anvil", Transport, typeof anvil>
    readonly public: PublicClient<Transport, typeof anvil>
    readonly wallet: WalletClient<Transport, typeof anvil, Account>
    #process?: ChildProcess

    /** Pass in the host and port to bind to, and optionally an URL, which defaults to host:port. */
    constructor(params: AnvilParams) {
        super()
        this.host = params.host ?? "127.0.0.1"
        this.port = params.port ?? 8545
        this.protocol = params.protocol ?? "http"
        this.url = params.url ?? `${this.protocol}://${this.host}:${this.port}`
        this.blockTime = params.blockTime ?? 2
        this.extraCliArgs = params.extraCliArgs ?? []
        this.logger = params.logger ?? Logger.create("Anvil", { level: LogLevel.OFF })
        const transport = this.isWebsocket() ? webSocket(this.url) : http(this.url)
        const config = { chain: anvil, transport, mode: "anvil" } as const
        this.test = createTestClient(config)
        this.public = createPublicClient(config)
        this.account =
            params.account ?? privateKeyToAccount("0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")
        this.wallet = createWalletClient({ ...config, account: this.account })
        this.stdoutFilter = params.stdoutFilter ?? (() => false)
        this.stderrFilter = params.stderrFilter ?? (() => false)
        this.stdoutHandler = params.stdoutHandler ?? null
        this.stderrHandler = params.stderrHandler ?? null

        // Setup exit handlers only once.
        process.on("exit", () => tryCatch(() => this.#process?.kill()))
        process.on("SIGINT", () => {
            if (!this.#process) return
            this.logger.trace("Received SIGINT, cleaning up...")
            tryCatch(() => this.#process?.kill())
            process.exit(0)
        })
    }

    /** Whether the URL and clients use Websocket. */
    isWebsocket(): boolean {
        return this.protocol.startsWith("ws")
    }

    /** Returns true if Anvil is ready (ascertain by making a chainId JSON-RPC request). Does not reject. */
    async isReady(): Promise<boolean> {
        return !!tryCatchAsyncU(this.public.getChainId())
    }

    /**
     * Wait untils either Anvil is ready by polling chainId RPC requests until ready or {@link
     * timeout} milliseconds elapse, in which case this rejects with {@link TimeoutError}.
     */
    async waitUntilReady(timeout?: number): Promise<void> {
        await waitForCondition(() => this.isReady(), timeout, 200)
        this.logger.trace("Anvil is ready!")
    }

    /**
     * Mines {@link numBlocks} (default 1) with the given {@link interval}
     * (defaulting to whatever Anvil is currenlty on).
     *
     * Can reject with an exception from Viem.
     */
    async mine(numBlocks?: number, interval?: number): Promise<void> {
        return await this.test.mine({ blocks: numBlocks ?? 1, interval })
    }

    /**
     * Kill any Anvil process listening on the same port. This can kill the child process
     * started by this service too, but you should use {@link stop} to do that instead.
     */
    killConflictingProcesses() {
        tryCatch(() => execSync(`pkill -f 'anvil.*--port ${this.port}'`, { stdio: "ignore" }))
    }

    /**
     * Starts the anvil process and if {@link waitReadyTimeout} is specified and > 0, waits until ready or
     * for the specified timeout. Does not wait otherwise, but you can call {@link waitUntilReady} manually.
     *
     * If the parent process exits, the process will be automatically killed.
     *
     * Can reject with OS and I/O errors.
     */
    async start(waitReadyTimeout?: number): Promise<void> {
        const cliArgs = [
            `--port=${this.port}`,
            `--host=${this.host}`,
            `--block-time=${this.blockTime}`,
            ...this.extraCliArgs,
        ]
        this.logger.info("Starting Anvil with args", cliArgs)

        const anvil = spawn("anvil", cliArgs)
        this.#process = anvil

        // Set up stdout handling with filtering to reduce noise
        anvil.stdout.on("data", (data) => {
            const output = data.toString().trim()
            if (this.stdoutHandler) this.stdoutHandler(output)
            else if (this.stdoutFilter?.(output)) this.logger.trace(output)
        })

        anvil.stderr.on("data", (data) => {
            const output = data.toString().trim()
            if (this.stderrHandler) this.stderrHandler(output)
            else if (this.stderrFilter?.(output)) this.logger.trace(output)
        })

        if (waitReadyTimeout) this.waitUntilReady(waitReadyTimeout)
    }

    /** Attempts to stop the Anvil process, returning true if successful. Does not throw. */
    stop(): boolean {
        return !!tryCatchU(() => this.#process?.kill())
    }
}
