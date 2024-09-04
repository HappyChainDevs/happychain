import { defineChain } from "viem";

export const happySepChain = defineChain({
  // since there is no definition in the package (s00n)
  id: 216,
  name: "HappyChain",
  nativeCurrency: { name: "Happy", symbol: "HAPPY", decimals: 18 },
  rpcUrls: {
    default: {
      http: ["https://happy-testnet-sepolia.rpc.caldera.xyz/http"],
    },
  },
  blockExplorers: {
    // dummy
    default: {
      name: "Etherscan",
      url: "https://etherscan.io",
      apiUrl: "https://api.etherscan.io/api",
    },
  },
  testnet: true,
});
