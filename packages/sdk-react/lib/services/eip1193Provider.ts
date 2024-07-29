import { EIP1193ProviderProxy, config } from "@happychain/core";
import { eip1193providerBus } from "../services/eventBus";

export const eip1193Provider = new EIP1193ProviderProxy(
	eip1193providerBus,
	config,
);

eip1193Provider.on("connect", () => {
	console.log("EIP1193 provider connected");
});
eip1193Provider.on("disconnect", () => {
	console.log("EIP1193 provider disconnected");
});
