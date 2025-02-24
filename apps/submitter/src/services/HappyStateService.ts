import type { HappyState } from "#src/database/generated"
import type { HappyStateRepository } from "#src/database/repositories/HappyStateRepository"
import type { HappyTxState } from "#src/tmp/interface/HappyTxState"
import { EntryPointStatus } from "#src/tmp/interface/status"

export class HappyStateService {
    constructor(private happyStateRepository: HappyStateRepository) {}

    async findByHash(hash: `0x${string}`): Promise<HappyTxState | undefined> {
        // TODO: don't need 'state' table, it can be derived from receipt table
        const state = await this.happyStateRepository.fetchByHashWithReceipt(hash)
        if (!state) return undefined

        const included = state.happyReceipt?.status === EntryPointStatus.Success

        if (included) {
            return {
                status: EntryPointStatus.Success,
                included: true, // if receipt then true?
                receipt: state.happyReceipt, // log string is not Log[]
            }
        }

        return {
            status: state.happyReceipt?.status as HappyTxState["status"],
            included: false,
            simulation: undefined, // TODO: we don't store the simulation results, should we?
        }
    }

    async findByHashAndTimeout(
        hash: `0x${string}`,
        timeout: number | undefined = 30_000,
    ): Promise<HappyTxState | undefined> {
        const state = await this.findByHash(hash)
        if (state) return state

        const start = Date.now()

        const recheck = async (
            resolve: (value: HappyTxState | PromiseLike<HappyTxState | undefined> | undefined) => void,
            reject: (reason?: unknown) => void,
        ) => {
            setTimeout(async () => {
                const maybe = await this.findByHash(hash)
                if (maybe) return resolve(maybe)

                if (Date.now() - start > timeout) {
                    reject("Failed to find state")
                } else {
                    recheck(resolve, reject)
                }
            }, 250)
        }
        return new Promise((resolve, reject) => recheck(resolve, reject))
    }

    async insert(newHappyState: Omit<HappyState, "id">) {
        const state = await this.happyStateRepository.insert(newHappyState)
        return state
    }
}
