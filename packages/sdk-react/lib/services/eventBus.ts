import {
	type EIP1193ProxiedEvents,
	EventBusChannel,
	EventBus,
	type HappyEvents,
	eventBus,
} from "@happychain/core";

export const eip1193providerBus = new EventBus<EIP1193ProxiedEvents>({
	mode: EventBusChannel.Port2,
	scope: "happy-chain-eip1193-provider",
});

export const messageBus = new EventBus<HappyEvents>({
	mode: EventBusChannel.Port2,
	scope: "happy-chain-bus",
});
