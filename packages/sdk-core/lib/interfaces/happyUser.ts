export interface HappyUser {
	uid: string;

	// social
	email: string;
	name: string;
	avatar: string;

	// connection details
	provider: string;
	type: "social" | "injected";

	// onchain
	ens: string;
	address: `0x${string}`;
	addresses: `0x${string}`[];
}
