import EventEmitter from "eventemitter3"

export enum Topics {
    NewBlock = "NewBlock",
}

export type EventBus = EventEmitter<Topics>

export const eventBus: EventBus = new EventEmitter()
