import { happyProvider, chains } from "@happychain/react";
import { injected } from "wagmi/connectors";
import { createConfig, custom } from "wagmi";
import { Chain } from "wagmi/chains";

export const happyConnector = injected({
  shimDisconnect: false,
  target() {
    return {
      id: "happyProvider",
      name: "HappyChain Provider",
      provider: happyProvider,
    };
  },
});

const config = createConfig({
  chains: [chains.defaultChain as Chain],
  multiInjectedProviderDiscovery: true,
  connectors: [happyConnector],
  transports: {
    [chains.defaultChain.chaindId]: custom(happyProvider!!),
  },
});

export { config as wagmiConfig };
