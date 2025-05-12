import { type Address, type Hash, type Hex, sleep } from "@happy.tech/common"
import { type Result, ResultAsync, err, ok } from "neverthrow"
import type { Block, Transaction, TransactionReceipt } from "viem"
import { deployment, env } from "#lib/env"
import { computeHash, dbService } from "#lib/services"
import type { StoredReceipt } from "#lib/services/DatabaseService"
import {
    type Boop,
    type BoopReceipt,
    type EVMReceipt,
    type Log,
    Onchain,
    type OnchainStatus,
    type TransactionTypeName,
} from "#lib/types"
import { publicClient } from "#lib/utils/clients"
import { logger } from "#lib/utils/logger.ts"
import { decodeEvent, getSelectorFromEventName } from "#lib/utils/parsing"

const BOOP_STARTED_SELECTOR = getSelectorFromEventName("BoopExecutionStarted") as Hex
const BOOP_SUBMITTED_SELECTOR = getSelectorFromEventName("BoopSubmitted") as Hex

export class ReceiptService {
    
    #unwatchBlocks?: () => void  
    #pending = new Map<Hash, (r: Result<BoopReceipt, unknown>) => void>()

    startBlockWatcher() {
        if (this.#unwatchBlocks) return // already running
        this.#unwatchBlocks = publicClient.watchBlocks({
            includeTransactions: true,
            onBlock: (block) => this.#handleBlock(block),
            onError: (e) => logger.error("watchBlocks error", e),
        })
        logger.info("ReceiptService: block watcher started")
    }
    
    
    async getReceipt(boopHash: Hash, txHash?: Hash, boop?: Boop): Promise<BoopReceipt | undefined> {
        try {
            // Try loading from DB.
            const storedReceipt = await dbService.findReceipt(boopHash)
            if (storedReceipt) return this.#loadReceiptFromDB(storedReceipt)
            // Otherwise, build the boop receipt from the boop & the EVM receipt.
            // Get receipt, for which we need an EVM tx hash.
            if (!txHash) return // TODO store txHash in DB
            const promise = publicClient.getTransactionReceipt({ hash: txHash })
            const result = await ResultAsync.fromPromise(promise, (e) => e)
            if (result.isErr()) return
            const txReceipt = result.value
            dbService.saveEVMReceipt(boopHash, txReceipt as EVMReceipt)
            // If we have a boop, build direct.
            if (boop) return this.#buildReceipt(boop, txReceipt)
            // Otherwise fetch it from the DB.
            const storedBoop = await dbService.findBoop(boopHash)
            return storedBoop ? this.#buildReceipt(storedBoop, txReceipt) : undefined
        } catch (error) {
            // We only expect database errors here.
            logger.error("Error while retrieving receipt", boopHash, error)
        }
    }

    async waitForInclusion(
        boop: Boop,
        txHash: Hash,
        timeout = env.RECEIPT_TIMEOUT,
    ): Promise<Result<BoopReceipt, unknown>> {
        const boopHash = computeHash(boop)
        try {
            // Try loading from DB.
            const storedReceipt = await dbService.findReceipt(boopHash)
            if (storedReceipt) return ok(this.#loadReceiptFromDB(storedReceipt))
            // Wait for EVM tx receipt, then build the boop receipt once obtained.
            // TODO this needs a timeout / cancellation policy
            
            this.startBlockWatcher()

            return new Promise((resolve) => {
                const timer = setTimeout(() => {
                    this.#pending.delete(boopHash)
                    resolve(err(new Error("Timed out waiting for inclusion")))
                }, timeout)
            
                this.#pending.set(boopHash, (result) => {
                    clearTimeout(timer)
                    resolve(result)
                })
            })
        } catch (error) {
            logger.warn("Error while monitoring receipt", boopHash, error)
            return err(error)
        }
    }

    // TODO delete? → after saving txHash alongside tx
    // TODO this is busted: we currently don't store logs, meaning we can't provide them in here
    //      no tests fail, but we should make one
    async find(boopHash: Hash, timeout = 0, pollInterval = 250): Promise<BoopReceipt | undefined> {
        if (timeout === 0) return this.getReceipt(boopHash)
        const end = Date.now() + timeout
        while (true) {
            const receipt = await this.getReceipt(boopHash)
            if (receipt) return receipt
            if (Date.now() > end) return
            await sleep(pollInterval)
        }
    }

    #buildReceipt(boop: Boop, txReceipt: TransactionReceipt): BoopReceipt {
        const boopHash = computeHash(boop)
        const receipt = {
            boopHash,
            account: boop.account,
            nonceTrack: boop.nonceTrack,
            nonceValue: boop.nonceValue,
            entryPoint: txReceipt.to as Address, // will be populated, our receipts are not contract deployemnts
            // TODO that needs much more complex logic, which currently lives in execute.ts
            status: txReceipt.status === "success" ? Onchain.Success : Onchain.UnexpectedReverted,
            // TODO filter just like in execute
            logs: this.#filterLogs(txReceipt.logs, boopHash),
            // TODO assign this correctly
            revertData: "0x" as Hex,
            // TODO think/check these values
            gasUsed: txReceipt.gasUsed,
            gasCost: txReceipt.gasUsed * txReceipt.effectiveGasPrice + boop.submitterFee,
            txReceipt: txReceipt as EVMReceipt, // subset + specialization that are known to hold in our use-case
        }
        void dbService.saveReceipt(receipt) // no need to wait on write to proceed
        return receipt
    }

    #filterLogs(logs: Log[], boopHash: Hash): Log[] {
        let select = false
        const filteredLogs: Log[] = []
        for (const log of logs) {
            const fromEntryPoint = log.address.toLowerCase() === deployment.EntryPoint.toLowerCase()
            if (fromEntryPoint && log.topics[0] === BOOP_SUBMITTED_SELECTOR) {
                const decodedLog = decodeEvent(log)
                if (!decodedLog) throw new Error("Found BoopSubmitted event but could not decode")
                const decodedHash = computeHash(decodedLog.args as Boop)
                if (decodedHash === boopHash) {
                    return filteredLogs
                } else {
                    select = false
                    filteredLogs.length = 0
                }
            } else if (select) {
                filteredLogs.push(log)
            } else if (fromEntryPoint && log.topics[0] === BOOP_STARTED_SELECTOR) {
                select = true
            }
        }
        return []
    }

    #loadReceiptFromDB(storedReceipt: StoredReceipt): BoopReceipt {
        const it = storedReceipt
        return {
            boopHash: it.boopHash,
            status: it.status as OnchainStatus,
            entryPoint: it.entryPoint,
            account: it.account,
            nonceTrack: it.nonceTrack,
            nonceValue: it.nonceValue,
            logs: [], // TODO
            revertData: it.revertData,
            gasUsed: it.gasUsed,
            gasCost: it.gasCost,
            txReceipt: {
                type: it.type as TransactionTypeName,
                status: it.status as "success" | "reverted",
                transactionHash: it.transactionHash,
                from: it.from,
                to: it.to,
                blockHash: it.blockHash,
                blockNumber: it.blockNumber,
                effectiveGasPrice: it.effectiveGasPrice,
                gasUsed: it.gasUsed,
            } satisfies EVMReceipt,
        } satisfies BoopReceipt
    }

    async #handleBlock(block: Block) {
        const ep = deployment.EntryPoint.toLowerCase()
    
        const transactions: (Transaction | Hash)[] =
            block.transactions ??
            (await publicClient.getBlock({
                blockHash: block.hash!,
                includeTransactions: true,
        })).transactions!
    
        for (const tx of transactions) {
          const to = typeof tx === "string" ? undefined : tx.to?.toLowerCase()
          if (to !== ep) continue
    
          const txHash = (typeof tx === "string" ? tx : tx.hash) as Hash
          try {
            const txReceipt = await publicClient.getTransactionReceipt({ hash: txHash })
    
            // Quickly locate a BoopExecutionStarted event
            const startedLog = txReceipt.logs.find(
              (l) => l.topics[0] === BOOP_STARTED_SELECTOR
            )
            if (!startedLog) continue
    
            const decodedEvent = decodeEvent(startedLog)
            if (!decodedEvent) {
                logger.warn("Failed to decode event", startedLog)
                continue
            }
            const boop = decodedEvent.args as Boop
            const boopHash = computeHash(boop)
            void dbService.saveEVMReceipt(boopHash, txReceipt as EVMReceipt)
    
            // Build & persist our domain receipt
            const receipt = this.#buildReceipt(boop, txReceipt)
            void dbService.saveReceipt(receipt)
    
            // Fulfil any promise waiting on this boop
            const settle = this.#pending.get(boopHash)
            if (settle) {
              settle(ok(receipt))
              this.#pending.delete(boopHash)
            }
          } catch (e) {
            logger.warn("Failed to process candidate tx", txHash, e)
          }
        }
      }
}
