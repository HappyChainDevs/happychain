import SafeEventEmitter from "@metamask/safe-event-emitter";
import type { EIP1193Provider, EIP1193RequestFn, EIP1474Methods } from "viem";
import type { config } from "../../config";
import type { EventBus } from "../eventBus";
import type { Logger } from "../logger";
import {
	EIP1193UserRejectedRequestError,
	GenericProviderRpcError,
} from "./errors";
import type {
	EIP1193EventName,
	EIP1193ProxiedEvents,
	EIP1193RequestArg,
	EventUUID,
} from "./events";
import { requiresApproval } from "../permissions";

type Timer = ReturnType<typeof setInterval>;

type EIP1193ProviderProxyConfig = Pick<typeof config, "iframePath"> & {
	logger?: Logger;
};

type InFlightRequest = {
	// biome-ignore lint/suspicious/noExplicitAny: currently needed as a work around for Viem generics. Unsure how to pass proper type here derived from `provider.request` method parameter
	resolve: (value: any) => void;
	reject: (reason?: unknown) => void;
	popup: Window | null;
};

const POPUP_FEATURES = [
	"width=400",
	"height=800",
	"popup=true",
	"toolbar=0",
	"menubar=0",
].join(",");

class RestrictedEventEmitter extends SafeEventEmitter {
	on(
		// restrict types to only allow provider events
		eventName: EIP1193EventName,
		// biome-ignore lint/suspicious/noExplicitAny: TODO: Update with generics when SafeEventEmitter permits it https://github.com/HappyChainDevs/happychain/pull/1#discussion_r1697113957
		handler: (...args: any[]) => void
	) {
		super.on(eventName, handler);
		return this;
	}
}

export class EIP1193ProviderProxy
	extends RestrictedEventEmitter
	implements EIP1193Provider
{
	private inFlight = new Map<string, InFlightRequest>();
	private timer: Timer | null = null;

	constructor(
		private bus: EventBus<EIP1193ProxiedEvents>,
		private config: EIP1193ProviderProxyConfig
	) {
		super();

		bus.on("provider:event", this.handleProviderNativeEvent.bind(this));
		bus.on(
			"provider:request:complete",
			this.handleCompletedRequest.bind(this)
		);
		config.logger?.log("EIP1193Provider Created");
	}

	private handleProviderNativeEvent(
		data: EIP1193ProxiedEvents["provider:event"]
	) {
		this.emit(data.payload.event, data.payload.args);
	}

	private handleCompletedRequest(
		data: EIP1193ProxiedEvents["provider:request:complete"]
	) {
		const req = this.inFlight.get(data.key);

		if (!req) {
			return { resolve: null, reject: null };
		}

		const { resolve, reject, popup } = req;
		this.inFlight.delete(data.key);
		popup?.close();

		if (reject && data.error) {
			reject(
				new GenericProviderRpcError({
					code: data.error.code,
					message: "",
					data: data.error.data,
				})
			);
		} else if (resolve) {
			resolve(data.payload);
		} else {
			// no key associated, perhaps from another tab context?
		}
	}

	private walletIsInjected() {
		// TODO: improve check. if wallet is injected (extension), we can simply proxy
		// the request to the iframe. if its not injected, we need to display the
		// approval popup.
		// NOTE: this is a UX optimization, actual wallet injection check occurs within
		// the iframe for security
		return false;
	}

	private queueRequest(
		key: string,
		{ resolve, reject, popup }: InFlightRequest
	) {
		this.inFlight.set(key, { resolve, reject, popup });

		if (!this.timer && popup) {
			this.timer = setInterval(() => {
				let withPopups = 0;
				for (const [k, req] of this.inFlight) {
					if (!req.popup) {
						continue;
					}

					if (req.popup.closed) {
						// manually closed without explicit rejection
						req.reject(new EIP1193UserRejectedRequestError());
						this.inFlight.delete(k);
					} else {
						// still open
						withPopups++;
					}
				}

				if (this.timer && !withPopups) {
					clearInterval(this.timer);
				}
			}, 500); // every half second, check if popup has been manually closed
		}
	}

	request: EIP1193RequestFn<EIP1474Methods> = async (args) => {
		// Every request gets proxied through this function.
		// If it is eth_call or a non-tx non-signature request, we can auto-approve
		// by posting the request args using request:approve,
		// otherwise we open the popup and pass the request args through the hash URL.
		const key = crypto.randomUUID();

		return new Promise((resolve, reject) => {
			const restricted = requiresApproval(args);

			const requiresUserApproval = restricted && !this.walletIsInjected();

			const popup = requiresUserApproval
				? this.promptUser(key, args)
				: this.autoApprove(key, args);

			this.queueRequest(key, { resolve, reject, popup });
		});
	};

	private autoApprove(key: EventUUID, args: EIP1193RequestArg) {
		this.bus.emit("request:approve", { key, error: null, payload: args });
		return null;
	}

	private promptUser(key: EventUUID, args: EIP1193RequestArg) {
		const b64 = btoa(JSON.stringify(args));
		return window.open(
			`${this.config.iframePath}/request?args=${b64}&key=${key}`,
			"_blank",
			POPUP_FEATURES
		);
	}
}
