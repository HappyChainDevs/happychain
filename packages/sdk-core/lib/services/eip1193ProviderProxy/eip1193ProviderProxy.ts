import SafeEventEmitter from "@metamask/safe-event-emitter";
import type { RpcSchema } from "viem";
import type { config } from "../../config";
import type { EventBus } from "../eventBus";
import type { logger } from "../logger";
import { EIP1193UserRejectionError, ProviderRpcError } from "./errors";
import type {
	EIP1193EventName,
	EIP1193ProxiedEvents,
	EIP1193RequestArg,
	EIP1193RequestResult,
	EventUUID,
} from "./events";

type Timer = ReturnType<typeof setInterval>;

type EIP1193ProviderProxyConfig = Pick<typeof config, "happyPath"> & {
	logger?: typeof logger;
};

type InFlightRequest = {
	resolve: (value: unknown | PromiseLike<unknown>) => void;
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
		handler: Parameters<SafeEventEmitter["on"]>[1],
	) {
		super.on(eventName, handler);
		return this;
	}
}

export class EIP1193ProviderProxy extends RestrictedEventEmitter {
	private inFlight = new Map<string, InFlightRequest>();
	private timer: Timer | null = null;

	constructor(
		private bus: EventBus<EIP1193ProxiedEvents>,
		private config: EIP1193ProviderProxyConfig,
	) {
		super();
		bus.on("provider:event", (data) => {
			this.emit(data.payload.event, data.payload.args);
		});

		bus.on("provider:request:complete", (data) => {
			const { resolve, reject } = this.getRequestByKey(data.key);

			if (reject && data.error) {
				reject(
					new ProviderRpcError({
						code: data.error.code,
						message: "",
						data: data.error.data,
					}),
				);
			} else if (resolve) {
				resolve(data.payload);
			} else {
				// no key associated, perhaps from another tab context?
			}
		});

		config.logger?.log("CREATING EIP1193Provider");
	}

	private getRequestByKey(key: string) {
		const req = this.inFlight.get(key);
		if (!req) {
			return { resolve: null, reject: null };
		}

		const { resolve, reject, popup } = req;
		this.inFlight.delete(key);
		popup?.close();
		return { resolve, reject };
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
		{ resolve, reject, popup }: InFlightRequest,
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
						req.reject(new EIP1193UserRejectionError());
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

	async request<TRpcSchema extends RpcSchema | undefined = undefined>(
		args: EIP1193RequestArg,
	): Promise<EIP1193RequestResult<TRpcSchema>> {
		// Every request gets proxied through this function
		// if its eth_call or otherwise a non-tx, non-signature we can autoapprove
		// by posting the request args using request:approve
		// otherwise we open the popup passing the request args through the hash URL
		const key = crypto.randomUUID();

		return new Promise<EIP1193RequestResult<TRpcSchema>>((resolve, reject) => {
			const unrestricted = ["eth_call", "eth_getBlockByNumber"].includes(
				args.method,
			);

			const requiresUserApproval = !unrestricted && !this.walletIsInjected();
			if (requiresUserApproval) {
				const popup = this.promptUser(key, args);
				this.queueRequest(key, { resolve, reject, popup });
			} else if (this.walletIsInjected() || unrestricted) {
				this.bus.emit("request:approve", { key, error: null, payload: args });
				this.queueRequest(key, { resolve, reject, popup: null });
			}
		});
	}

	private promptUser(key: EventUUID, args: EIP1193RequestArg) {
		const b64 = btoa(JSON.stringify(args));
		return window.open(
			`${this.config.happyPath}/request?args=${b64}&key=${key}`,
			"_blank",
			POPUP_FEATURES,
		);
	}
}
