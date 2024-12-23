import {
    type LatestBlock,
    type Transaction,
    TransactionManager,
    type TransactionManagerConfig,
    TransactionStatus,
    TxmHookType,
} from "../../../lib/index"
import { getNumber } from "./getNumber"
const COUNTER_ADDRESS = "0xea7a81bacbac93afdc603902fe64ea3d361ba326" // Counter contract address deployed with create2 (wont change)

export class TestService {
    private readonly txm: TransactionManager
    private counterVal: bigint

    constructor(_txm: TransactionManager) {
        this.txm = _txm
        this.txm.addTransactionOriginator(this.onCollectTransactionsSendOnce.bind(this))
    }

    public addTransactionOriginator() {
        this.txm.addTransactionOriginator(this.onCollectTransactionsSendOnce.bind(this))
    }

    async start() {
        this.counterVal = await getNumber(COUNTER_ADDRESS)
        await this.txm.start()
        await this.txm.addHook(this.onTransactionStatusChange.bind(this), TxmHookType.TransactionStatusChanged)
        await this.txm.addHook(this.onNewBlock.bind(this), TxmHookType.NewBlock)
    }

    private async onTransactionStatusChange(payload: { transaction: Transaction }) {
        console.log("onTransactionStatusChange:: payload: ", payload)
    }

    private async onNewBlock(block: LatestBlock) {
        console.log("onNewBlock:: block: ", block)
    }


    private async onCollectTransactionsSendOnce(block: LatestBlock): Promise<Transaction[]> {
        if(await getNumber(COUNTER_ADDRESS) === this.counterVal) {
            return [this.txm.createTransaction({
                address: COUNTER_ADDRESS,
                functionName: "increment",
                contractName: "Counter",
                args: [],
            })]
        }
        return []
    }
}