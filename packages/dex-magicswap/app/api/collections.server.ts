import { getCachedValue } from "~/lib/cache.server";
import { ENV } from "~/lib/env.server";
import type {
  Token,
  TroveCollection,
  TroveCollectionMapping,
  TroveTokenMapping,
} from "~/types";
import { fetchTroveTokenMapping } from "./tokens.server";

/**
 * Fetches NFT collection metadata
 */
const fetchCollections = (addresses: string[]) =>
  // Cache this because it's relatively static NFT collection metadata
  getCachedValue(`trove-collections-${addresses.join()}`, async () => {
    const url = new URL(`${ENV.TROVE_API_URL}/batch-collections`);
    url.searchParams.set(
      "slugs",
      addresses
        .map((address) => `${ENV.TROVE_API_NETWORK}/${address}`)
        .join(","),
    );

    const response = await fetch(url.toString(), {
      headers: {
        "X-API-Key": ENV.TROVE_API_KEY,
      },
    });
    const result = (await response.json()) as TroveCollection[];
    return result;
  });

export const fetchTokensCollections = async (
  tokens: Token[],
): Promise<[TroveCollectionMapping, TroveTokenMapping]> => {
  const addresses = [
    ...new Set(
      tokens.flatMap(({ vaultCollections }) =>
        vaultCollections.map(({ collection }) => collection.id),
      ),
    ),
  ];

  const tokenIds = [
    ...new Set(
      tokens.flatMap(({ vaultCollections }) =>
        vaultCollections.flatMap(
          ({ collection: { id: address }, tokenIds }) =>
            tokenIds?.map((tokenId) => `${address}/${tokenId}`) ?? [],
        ),
      ),
    ),
  ];

  const [collections, tokenMapping] = await Promise.all([
    fetchCollections(addresses),
    fetchTroveTokenMapping(tokenIds),
  ]);

  const collectionMapping = collections.reduce((acc, collection) => {
    acc[collection.collectionAddr.toLowerCase()] = collection;
    return acc;
  }, {} as TroveCollectionMapping);

  return [collectionMapping, tokenMapping];
};
