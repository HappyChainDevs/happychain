import { TOKEN_METADATA } from "~/consts";
import type {
  PoolToken,
  Token,
  TroveCollectionMapping,
  TroveTokenMapping,
} from "~/types";
import { truncateEthAddress } from "./address";
import { createPoolTokenCollection } from "./collections.server";
import { ENV } from "./env.server";

type Item = {
  collection: {
    id: string;
  };
  tokenId: string;
  amount: number;
};

export const itemToTroveTokenItem = (
  { collection: { id: collectionId }, tokenId, amount }: Item,
  tokens: TroveTokenMapping,
) => {
  const tokenDetails = tokens[collectionId]?.[tokenId];
  return {
    collectionId,
    tokenId,
    amount,
    name: tokenDetails?.metadata.name ?? "",
    image: tokenDetails?.image.uri ?? "",
    attributes: (tokenDetails?.metadata?.attributes || []).map(
      ({ value, trait_type: traitType, display_type: displayType = null }) => ({
        value,
        traitType,
        displayType,
      }),
    ),
  };
};

const createTokenMetadata = (
  token: Token,
  collectionMapping: TroveCollectionMapping,
  tokenMapping: TroveTokenMapping,
) => {
  const metadata = TOKEN_METADATA[ENV.PUBLIC_CHAIN_ID].find(
    ({ id }) => id.toLowerCase() === token.id.toLowerCase(),
  );
  if (metadata) {
    return metadata;
  }

  if (token.isNFT) {
    const vaultCollectionAddresses = token.vaultCollections.map(
      ({ collection: { id } }) => id,
    );
    const vaultTokenIds = token.vaultCollections.flatMap(
      ({ tokenIds }) => tokenIds ?? [],
    );
    const vaultCollection = vaultCollectionAddresses[0]
      ? collectionMapping[vaultCollectionAddresses[0]]
      : undefined;
    const vaultToken =
      vaultCollectionAddresses[0] && vaultTokenIds[0]
        ? tokenMapping[vaultCollectionAddresses[0]]?.[vaultTokenIds[0]]
        : undefined;

    // Vault is a single collection with a single token ID defined
    if (
      vaultCollectionAddresses.length === 1 &&
      vaultTokenIds.length === 1 &&
      vaultToken
    ) {
      return {
        name: vaultToken.metadata.name,
        symbol: vaultToken.metadata.name,
        image: vaultToken.image.uri,
      };
    }

    // Vault is multiple collections with multiple token IDs defined
    if (
      vaultCollectionAddresses.length > 0 &&
      vaultTokenIds.length > 1 &&
      vaultToken
    ) {
      const type = vaultToken?.metadata.attributes.find(
        ({ trait_type }) => trait_type.toLowerCase() === "type",
      )?.value;
      if (type) {
        const name = `${type}s`;
        return {
          name,
          symbol: name,
          image: vaultToken.image.uri,
        };
      }
    }

    const name = vaultCollectionAddresses
      .map(
        (address) =>
          collectionMapping[address]?.displayName ??
          truncateEthAddress(address),
      )
      .join(" & ");
    return {
      name,
      symbol: name,
      image: vaultCollection?.thumbnailUri,
    };
  }

  return {
    name: token.name,
    symbol: token.symbol.toUpperCase(),
    image: undefined,
  };
};

export const createPoolToken = (
  token: Token,
  collectionMapping: TroveCollectionMapping,
  tokenMapping: TroveTokenMapping,
  magicUSD: number,
): PoolToken => {
  const tokenCollections =
    token.vaultCollections.map(({ collection, tokenIds }) =>
      createPoolTokenCollection(collection, tokenIds ?? [], collectionMapping),
    ) ?? [];
  const metadata = createTokenMetadata(token, collectionMapping, tokenMapping);
  return {
    ...token,
    ...(tokenCollections[0]?.type
      ? {
          type: tokenCollections[0]?.type,
        }
      : {}),
    ...metadata,
    decimals: Number(token.decimals),
    collections: tokenCollections,
    urlSlug: tokenCollections[0]?.urlSlug ?? "",
    collectionId: tokenCollections[0]?.id ?? "",
    collectionTokenIds: tokenCollections[0]?.tokenIds ?? [],
    priceUSD: Number(token.derivedMAGIC) * magicUSD,
    reserve: "0",
  };
};
