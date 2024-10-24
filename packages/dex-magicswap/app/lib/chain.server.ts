import { http, createPublicClient } from "viem";
import { arbitrum, arbitrumSepolia } from "viem/chains";

import { ENV } from "./env.server";

export const client = createPublicClient({
  chain:
    ENV.PUBLIC_CHAIN_ID === arbitrumSepolia.id ? arbitrumSepolia : arbitrum,
  transport: http(
    `https://${ENV.PUBLIC_CHAIN_ID}.rpc.thirdweb.com/${ENV.PUBLIC_THIRDWEB_CLIENT_ID}`,
  ),
});
