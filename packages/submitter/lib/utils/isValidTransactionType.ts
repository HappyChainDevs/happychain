import { TransactionTypeName } from "#lib/interfaces/ethereum"

export function isValidTransactionType(type: string): type is TransactionTypeName {
    return Object.values(TransactionTypeName).includes(type as TransactionTypeName)
}
