/**
 * This script is intended to be run as part of a cron job to test boop's on testnet.
 * It creates a new account, prepares a boop that mints a token, and calls execute on the Entrypoint.
 */

import { abis, deployment } from "@happy.tech/contracts/boop/sepolia"
import { type ExecuteSuccess, BoopClient, computeBoopHash, Onchain } from "@happy.tech/boop-sdk"
import { deployment as mockDeployments } from "@happy.tech/contracts/mocks/sepolia"
import { webSocket, createPublicClient, zeroAddress, hexToBytes, Hex, keccak256, BlockNotFoundError, Block } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { happychainTestnet } from "viem/chains"

const pk = generatePrivateKey()
const testAccount = privateKeyToAccount(pk as `0x${string}`)

const publicClient = createPublicClient({
    chain: happychainTestnet,
    transport: webSocket(),
})


const BLOOM_SIZE_BYTES = 256          // fixed in protocol
const zeroLogsBloom =
  "0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000"

/**
 * Return `true` iff the three bits derived from `input` are all set in `bloom`.
 * False‑positives are possible; false‑negatives are not.
 */
export const isInBloom = (bloom: Hex, input: Hex): boolean => {
  const bloomBytes = hexToBytes(bloom)
  const hash       = hexToBytes(keccak256(input))   // 32‑byte Keccak

  for (const i of [0, 2, 4]) {                      // pick 3 × 11‑bit buckets
    const bit  = (hash[i + 1]! + (hash[i]! << 8)) & 0x07ff // 0‑2047
    const byte = BLOOM_SIZE_BYTES - 1 - (bit >> 3)
    const mask = 1 << (bit & 7)
    if ((bloomBytes[byte]! & mask) === 0) return false
  }
  return true
}

const STARTED_SIG   = "0x7919742665278276d4d5e9b0b8d8ed9eb969973cffb8bf4700ff39df91ac1ab1"         // already have these
const SUBMITTED_SIG = "0x2679a4611431daccdaea2c844ea9ba2f7427ac1ecb51d07d7ecd746a9e7a8050"
const ENTRY_POINT   = deployment.EntryPoint.toLowerCase() as Hex

/** quick negative test – returns false for ≥ 95 % of blocks */
function headerCouldContainBoop(header: Block): boolean {
  const bloom = header.logsBloom
  if (!bloom || bloom === zeroLogsBloom) return false          // empty in dev‑nets

  // all three conditions must be *possible* in the bloom
//   console.log("isInBloom--entrypoint", isInBloom(bloom, ENTRY_POINT))
//   console.log("isInBloom--startedSig", isInBloom(bloom, STARTED_SIG))
//   console.log("isInBloom--submittedSig", isInBloom(bloom, SUBMITTED_SIG))   
  return (
    isInBloom(bloom, ENTRY_POINT) &&
    isInBloom(bloom, STARTED_SIG) &&
    isInBloom(bloom, SUBMITTED_SIG)
  )
}

async function run(){
    publicClient.watchBlocks({
        includeTransactions: true,
        onBlock: async (block) => {
            console.log(block.number)
            console.log("headerCouldContainBoop", headerCouldContainBoop(block))    

            
            // const transactions = block.transactions
            // for (const tx of transactions) {
            //     if(tx.to === deployment.EntryPoint.toLowerCase()) {
            //         console.log("Found tx to EntryPoint", tx)
            //         const receipt = await publicClient.getTransactionReceipt({ hash: tx.hash })
            //         if (receipt) {
            //             console.log("Found receipt", receipt)
            //             const logs = receipt.logs
            //             for (const log of logs) {
            //                 if (log.address.toLowerCase() === deployment.EntryPoint.toLowerCase()) {
            //                     console.log("Found log from EntryPoint", log)
            //                 }
            //             }
            //         }
            //     }
            // }
        }
    })
}
run()