import {
	type EIP1193ErrorObject,
	type EIP1193ProxiedEvents,
	type EIP1193RequestResult,
	EventBusChannel,
	EventBus,
	type EventUUID,
	type HappyEvents,
	eventBus,
} from "@happychain/core";

export const eip1193providerBus = new EventBus<EIP1193ProxiedEvents>({
	target: window.parent,
	mode: EventBusChannel.Port1,
	scope: "happy-chain-eip1193-provider",
});

export const messageBus = new EventBus<HappyEvents>({
	mode: EventBusChannel.Port2,
	scope: "happy-chain-eip1193-provider",
});

/**
 * Broadcasts events on same domain
 * Main use case is iframe<->popup communication
 */

export interface BroadcastEvents {
	"request:approve": {
		error: null;
		key: EventUUID;
		payload: EIP1193RequestResult;
	};
	"request:reject": {
		error: EIP1193ErrorObject;
		key: EventUUID;
		payload: null;
	};
}

export const broadcastBus = new EventBus<BroadcastEvents>({
	mode: EventBusChannel.Broadcast,
	scope: "server:popup",
});
