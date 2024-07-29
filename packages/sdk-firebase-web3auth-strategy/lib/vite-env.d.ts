/// <reference types="vite/client" />

interface ImportMetaEnv {
	// # Firebase Setup
	readonly VITE_FIREBASE_API_KEY: string;
	readonly VITE_FIREBASE_AUTH_DOMAIN: string;
	readonly VITE_FIREBASE_PROJECT_ID: string;
	readonly VITE_FIREBASE_STORAGE_BUCKET: string;
	readonly VITE_FIREBASE_MESSAGE_SENDER_ID: string;
	readonly VITE_FIREBASE_APP_ID: string;

	// Firebase Measurement ( analytics ) optional
	readonly VITE_FIREBASE_MEASUREMENT_ID?: string | undefined;

	// # Web3Auth Setup
	// # https://dashboard.web3auth.io
	// # Projects > Custom Authentication > Create Verifier using Firebase JWT
	readonly VITE_WEB3AUTH_CLIENT_ID: string;
	readonly VITE_WEB3AUTH_NETWORK: "sapphire_mainnet" | "sapphire_devnet";

	// # Web3Auth Chain Setup
	readonly VITE_WEB3AUTH_CHAIN_NAMESPACE:
		| "eip155"
		| "solana"
		| "casper"
		| "xrpl"
		| "other";
	readonly VITE_WEB3AUTH_CHAIN_ID: string;
	readonly VITE_WEB3AUTH_CHAIN_RPC: string;
	readonly VITE_WEB3AUTH_CHAIN_DISPLAYNAME: string;
	readonly VITE_WEB3AUTH_CHAIN_BLOCK_EXPLORER: string;
	readonly VITE_WEB3AUTH_CHAIN_TOKEN_SYMBOL: string;
	readonly VITE_WEB3AUTH_CHAIN_TOKEN_NAME: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
