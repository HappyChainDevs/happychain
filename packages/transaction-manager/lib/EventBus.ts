import EventEmitter from "eventemitter3"

export enum Topics {
    NewBlock = "NewBlock",
    TransactionStatusChanged = "TransactionStatusChanged",
}

export type EventBus = EventEmitter<Topics>

export const eventBus: EventBus = new EventEmitter()
