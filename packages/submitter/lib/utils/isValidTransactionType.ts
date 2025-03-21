import { TransactionTypeName } from "#lib/tmp/interface/common_chain"

export function isValidTransactionType(type: string): type is TransactionTypeName {
    return Object.values(TransactionTypeName).includes(type as TransactionTypeName)
}
