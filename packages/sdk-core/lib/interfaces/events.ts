import type { EventHandler, EventKey } from "../services/eventBus";
import type { HappyUser } from "./happyUser";

export interface HappyEvents extends Record<EventKey, EventHandler> {
	// modal states
	"modal-toggle": EventHandler<boolean>;

	// user auth
	"auth-changed": EventHandler<HappyUser | null>;
}
