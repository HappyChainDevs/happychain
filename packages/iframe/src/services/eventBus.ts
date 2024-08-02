import {
	type EIP1193ProxiedEvents,
	EventBusChannel,
	type EventHandler,
	type EventKey,
	type EventUUID,
	eventBus,
} from "@happychain/core";

export const messageBus = eventBus<EIP1193ProxiedEvents>({
	target: window.parent,
	mode: EventBusChannel.Port1,
	scope: "happy-chain-events",
});

/**
 * Broadcasts events on same domain
 * Main use case is iframe<->popup communication
 */

export interface BroadcastEvents extends Record<EventKey, EventHandler> {
	"request:approve": EventHandler<{
		error: null;
		key: EventUUID;
		payload: unknown;
	}>;
	"request:reject": EventHandler<{
		error: { code: number; message: string; data: string };
		key: EventUUID;
		payload: null;
	}>;
}

export const broadcastBus = eventBus<BroadcastEvents>({
	mode: EventBusChannel.Broadcast,
	scope: "server:popup",
});
