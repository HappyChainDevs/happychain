import EventEmitter from "eventemitter3"

export enum Topics {
    NewBlock = "NewBlock",
    TransactionStatusChanged = "TransactionStatusChanged",
    TransactionSaveFailed = "TransactionSaveFailed",
    TransactionSubmissionFailed = "TransactionSubmissionFailed",
    RpcIsDown = "RpcIsDown",
    RpcIsUp = "RpcIsUp",
}

export type EventBus = EventEmitter<Topics>

export const eventBus: EventBus = new EventEmitter()
