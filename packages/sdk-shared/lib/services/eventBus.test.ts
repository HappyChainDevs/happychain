import { type Mock, beforeEach, describe, expect, it, mock } from "bun:test"
import { setTimeout } from "node:timers/promises"

import { createUUID } from "@happychain/common"
import { EventBus, EventBusMode, type EventBusOptions } from "./eventBus"

type TestBusSchema = {
    "callback:": { data: boolean; version: number }
    "callback-2": { data: boolean; version: number }
}

describe("event bus", () => {
    describe("message channel events", () => {
        let broadcastConfig: Omit<EventBusOptions, "mode">

        let emitterBusConfig: EventBusOptions
        let listenerBusConfig: EventBusOptions

        let args = { data: true, version: 1 }
        let mockCallback: Mock<(a: typeof args) => void>
        beforeEach(() => {
            broadcastConfig = {
                scope: createUUID(),
                logger: { log: mock(), warn: mock(), error: mock() },
            }

            // using forced instead of MessagePort 1/2 to skip cross-window handshake
            const mc = new MessageChannel()
            emitterBusConfig = {
                ...broadcastConfig,
                mode: EventBusMode.Forced,
                port: mc.port1,
            }

            listenerBusConfig = {
                ...broadcastConfig,
                mode: EventBusMode.Forced,
                port: mc.port2,
            }

            args = { data: true, version: 1 }
            mockCallback = mock((_a: typeof args) => {})
        })

        it("connects and communicates as expected", async () => {
            const emitterBus = new EventBus<TestBusSchema>(emitterBusConfig)
            const listenerBus = new EventBus<TestBusSchema>(listenerBusConfig)

            listenerBus.on("callback:", mockCallback)

            emitterBus.emit("callback:", args)
            emitterBus.emit("callback:", args)
            emitterBus.emit("callback:", args)

            await setTimeout(0)
            expect(mockCallback).toHaveBeenCalledTimes(3)
        })
    })
})
