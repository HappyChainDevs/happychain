import { createClient } from "@happychain/transaction-manager"

const client = createClient()

client.addTransactionCollector(() => {
    return []
})
