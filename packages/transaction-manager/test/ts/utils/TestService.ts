import { type LatestBlock, type Transaction, type TransactionManager, TxmHookType } from "../../../lib/index"
import { getNumber } from "./getNumber"
const COUNTER_ADDRESS = "0xea7a81bacbac93afdc603902fe64ea3d361ba326" // Counter contract address deployed with create2

export class TestService {
    public readonly txm: TransactionManager
    public counterVal: bigint

    constructor(_txm: TransactionManager) {
        this.txm = _txm
    }

    async start() {
        this.counterVal = await getNumber(COUNTER_ADDRESS)
        await this.txm.start()
        // await this.txm.addHook(this.onTransactionStatusChange.bind(this), TxmHookType.TransactionStatusChanged)
        await this.txm.addHook(this.onNewBlock.bind(this), TxmHookType.NewBlock)
    }

    private async onTransactionStatusChange(payload: { transaction: Transaction }) {
        console.log("onTransactionStatusChange:: payload: ", payload)
    }

    private async onNewBlock(block: LatestBlock) {
        console.log("onNewBlock:: block.number: ", block.number)
    }

    public addTransactionOriginator(oringinator: () => Promise<Transaction[]>) {
        this.txm.addTransactionOriginator(oringinator.bind(this))
    }
}
