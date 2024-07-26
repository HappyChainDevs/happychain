import type { HappyUser } from "@happychain/core";
import { atom, getDefaultStore } from "jotai";
import { messageBus } from "../services/eventBus";
import { LocalStorage } from "../services/storage";

export const userAtom = atom<HappyUser | null>(null);

const defaultStore = getDefaultStore();

// sync atom with localstorage
messageBus.on("auth-changed", (user) => {
	defaultStore.set(userAtom, user);
	LocalStorage.set("happychain:user", user);
});
