import type { Account } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import env from "#src/env"
import type { HappyTx } from "#src/tmp/interface/HappyTx"

// use mnemonic to derive multiple wallets from a single seed?
// const account = mnemonicToAccount("legal winner thank year wave sausage worth useful legal winner thank yellow", {
//     /** The account index to use in the path (`"m/44'/60'/${accountIndex}'/0/0"`). */
//     accountIndex: 0,
//     /** The change index to use in the path (`"m/44'/60'/0'/${changeIndex}/0"`). */
//     changeIndex: 0,
//     /** The address index to use in the path (`"m/44'/60'/0'/0/${addressIndex}"`). */
//     addressIndex: 0,
// })

const defaultAccount = privateKeyToAccount(env.PRIVATE_KEY_LOCAL)

// These fields where chosen as they could be useful when selection which account to execute with.
// can be adjusted to fit the actual requirements
type PartialTx = Pick<HappyTx, "account" | "nonceTrack" | "nonceValue" | "paymaster" | "dest">

export function findExecutionAccount(_tx?: PartialTx): Account {
    // TODO: select wallet per account.
    // One approach would be to check all current/pending/processed transactions
    // to find the least used account, then save this useraddress<->systemaccount relation
    // for future transactions to ensure that the same user account will always be processed
    // by the same system account
    return defaultAccount
}
