import { useChainId } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";

const createCollectionUrl = (url: string, slug: string) =>
  `${url}/collection/${slug}`;

export const useTrove = () => {
  const chainId = useChainId();
  const url =
    chainId === arbitrumSepolia.id
      ? "https://app-testnet.treasure.lol"
      : "https://app.treasure.lol";
  return {
    url,
    createCollectionUrl: (slug: string) => createCollectionUrl(url, slug),
    createTokenUrl: (slug: string, tokenId: string) =>
      `${createCollectionUrl(url, slug)}/${tokenId}`,
  };
};
