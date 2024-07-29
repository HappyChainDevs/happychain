import type { HappyUser } from "@happychain/core";

type StorageSchema = {
	"happychain:user": HappyUser | null;
};

type Key = keyof StorageSchema;

export const LocalStorage = {
	get<T extends Key>(key: T): StorageSchema[T] | null {
		// Return type will depend on the key
		const data = localStorage.getItem(key);

		//type ReturnType = ???
		if (data !== null) {
			return JSON.parse(data) as StorageSchema[T];
		}

		console.error(`localStorage missing object with key ${key}`);
		return null;
	},

	set<T extends Key>(key: T, value: StorageSchema[T]) {
		localStorage.setItem(key, JSON.stringify(value));
	},

	remove(key: Key) {
		localStorage.removeItem(key);
	},

	clear() {
		localStorage.clear();
	},
};
