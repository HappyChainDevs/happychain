/// <reference types="vite/client" />
/// <reference types="@remix-run/node" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      readonly PUBLIC_CHAIN_ID: number;
      readonly PUBLIC_THIRDWEB_CLIENT_ID: string;
      readonly PUBLIC_WALLET_CONNECT_PROJECT_ID: string;
      readonly TROVE_API_KEY: string;
    }
  }
}

export type {};
