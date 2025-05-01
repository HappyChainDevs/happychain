import { TransactionManager } from "@happy.tech/txm"
import { type Result, err, ok } from "neverthrow"
import type { Address } from "viem"
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
        if (faucetUsageResult.value.length >= env.FAUCET_RATE_LIMIT_MAX_REQUESTS) {
            return err(new FaucetRateLimitError())
        }

        const faucetUsage = FaucetUsage.create(address)
        await this.faucetUsageRepository.save(faucetUsage)

        const tx = await this.txm.createTransaction({
            address,
            value: env.TOKEN_AMOUNT,
            calldata: "0x",
        })

        await this.txm.sendTransactions([tx])

        return ok(undefined)
    }
}

export const faucetService = new FaucetService()
