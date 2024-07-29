import type { EIP1193EventMap, EIP1193RequestFn, RpcSchema } from "viem";
import type { EventHandler, EventKey } from "../eventBus";
import type { EIP1193ErrorObject } from "./errors";

export type EventUUID = ReturnType<typeof crypto.randomUUID>;
export type EIP1193RequestArg = Parameters<EIP1193RequestFn>[0];
export type EIP1193RequestResult<
	TRpcSchema extends RpcSchema | undefined = undefined,
> = Awaited<ReturnType<EIP1193RequestFn<TRpcSchema>>>;
export type EIP1193EventName = keyof EIP1193EventMap;

export interface EIP1193ProxiedEvents extends Record<EventKey, EventHandler> {
	// user approves request
	"request:approve": EventHandler<{
		key: EventUUID;
		error: null;
		payload: EIP1193RequestArg;
	}>;
	// user rejects request
	"request:reject": EventHandler<{
		key: EventUUID;
		error: EIP1193ErrorObject;
		payload: null;
	}>;

	// request completed (success or fail) TODO: split?
	"provider:request:complete": EventHandler<
		| {
				key: EventUUID;
				error: EIP1193ErrorObject;
				payload: null;
		  }
		| {
				key: EventUUID;
				error: null;
				// TODO: complex viem types ReturnType<typeof walletClient.request | typeof publicClient.request>
				payload: EIP1193RequestResult;
		  }
	>;

	// eip1193 events proxy
	"provider:event": EventHandler<{
		payload: { event: EIP1193EventName; args: unknown };
	}>;
}
