import type { HappyUser } from "@happychain/core";
import { atom, getDefaultStore } from "jotai";
import { messageBus } from "../services/eventBus";

export const userAtom = atom<HappyUser | null>(null);

const defaultStore = getDefaultStore();

// sync atom with localstorage
messageBus.on("auth-changed", (user) => {
	defaultStore.set(userAtom, user);
});
