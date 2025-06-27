import type { Address } from "@happy.tech/common"
import { TransactionManager, TransactionStatus } from "@happy.tech/txm"
import { type Result, err, ok } from "neverthrow"
import { env } from "../env"
import { FaucetRateLimitError } from "../errors"
import { FaucetUsage } from "../faucet-usage.entity"
import { FaucetUsageRepository } from "../faucet-usage.repository"

export class FaucetService {
    private txm: TransactionManager
    private faucetUsageRepository: FaucetUsageRepository

    constructor() {
        this.txm = new TransactionManager({
            rpc: { url: env.RPC_URL },
            chainId: env.CHAIN_ID,
            blockTime: env.BLOCK_TIME,
            privateKey: env.PRIVATE_KEY,
        })
        this.faucetUsageRepository = new FaucetUsageRepository()
    }

    async start() {
        await this.txm.start()
    }

    async sendTokens(address: Address): Promise<Result<undefined, Error>> {
        const faucetUsageResult = await this.faucetUsageRepository.findAllByAddress(address)
        if (faucetUsageResult.isErr()) {
            return err(faucetUsageResult.error)
        }
        if (faucetUsageResult.value.length >= 1) {
            const lastRequest = faucetUsageResult.value[0]
            const timeToWait =
                lastRequest.occurredAt.getTime() + env.FAUCET_RATE_LIMIT_WINDOW_SECONDS * 1000 - Date.now()

            if (timeToWait > 0) {
                return err(new FaucetRateLimitError(timeToWait))
            }
        }

        const tx = await this.txm.createTransaction({
            address,
            value: env.TOKEN_AMOUNT,
            calldata: "0x",
        })

        await this.txm.sendTransactions([tx])

        const result = await tx.waitForFinalization(10_000)

        if (result.isErr()) {
            return err(result.error)
        }

        if (result.value.status !== TransactionStatus.Success) {
            return err(new Error("Transaction failed"))
        }


        const faucetUsage = FaucetUsage.create(address)
        await this.faucetUsageRepository.save(faucetUsage)

        return ok(undefined)
    }
}

export const faucetService = new FaucetService()
