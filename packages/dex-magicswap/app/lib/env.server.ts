import { arbitrum, arbitrumSepolia } from "viem/chains";
import { TOKEN_METADATA } from "~/consts";

const CHAIN_ID_TO_TROVE_API_URL = {
  [arbitrumSepolia.id]: "https://trove-api-dev.treasure.lol",
  [arbitrum.id]: "https://trove-api.treasure.lol",
} as const;

const CHAIN_ID_TO_TROVE_API_NETWORK = {
  [arbitrumSepolia.id]: "arbsepolia",
  [arbitrum.id]: "arb",
} as const;

type SupportedChainId = keyof typeof CHAIN_ID_TO_TROVE_API_URL;

const CHAIN_ID = Number(process.env.PUBLIC_CHAIN_ID) as SupportedChainId;

export const ENV = {
  NODE_ENV: process.env.NODE_ENV,
  PUBLIC_CHAIN_ID: CHAIN_ID,
  PUBLIC_DEFAULT_TOKEN_ADDRESS: TOKEN_METADATA[CHAIN_ID]?.[0].id,
  PUBLIC_THIRDWEB_CLIENT_ID: process.env.PUBLIC_THIRDWEB_CLIENT_ID,
  PUBLIC_WALLET_CONNECT_PROJECT_ID:
    process.env.PUBLIC_WALLET_CONNECT_PROJECT_ID,
  TROVE_API_URL: CHAIN_ID_TO_TROVE_API_URL[CHAIN_ID],
  TROVE_API_NETWORK: CHAIN_ID_TO_TROVE_API_NETWORK[CHAIN_ID],
  TROVE_API_KEY: process.env.TROVE_API_KEY,
};
