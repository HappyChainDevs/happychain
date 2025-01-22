import EventEmitter from "eventemitter3"

export enum Topics {
    NewBlock = "NewBlock",
    TransactionStatusChanged = "TransactionStatusChanged",
    TransactionSaveFailed = "TransactionSaveFailed",
    TransactionSubmissionFailed = "TransactionSubmissionFailed",
}

export type EventBus = EventEmitter<Topics>

export const eventBus: EventBus = new EventEmitter()
