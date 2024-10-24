import { useAccount } from "wagmi";
import { arbitrum } from "wagmi/chains";

export const useBlockExplorer = () => {
  const { chain } = useAccount();
  return chain?.blockExplorers?.default ?? arbitrum.blockExplorers.default;
};
