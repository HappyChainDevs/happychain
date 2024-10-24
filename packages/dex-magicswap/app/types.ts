import type { SetOptional } from "type-fest";
import type { GetPairsQuery } from ".graphclient";

export type Optional<T> = T | undefined;

export type AddressString = `0x${string}`;
export type NumberString = `${number}`;

/** Data Transfer Objects */
// Subgraph
export type Pair = SetOptional<
  GetPairsQuery["pairs"][number],
  "hourData" | "dayData"
>;
export type Token = Pair["token0"];
export type Collection = NonNullable<
  Token["vaultCollections"]
>[number]["collection"];

// Trove
export type TroveCollection = {
  collectionAddr: string;
  contractType: "ERC721" | "ERC1155";
  displayName: string;
  thumbnailUri: string;
  urlSlug: string;
  symbol: string;
  numTokensOwnedByUser: number;
};

export type TroveCollectionMapping = Record<string, TroveCollection>;

export type TroveToken = {
  collectionAddr: string;
  contractType: "ERC721" | "ERC1155";
  tokenId: string;
  collectionUrlSlug: string;
  image: {
    uri: string;
  };
  metadata: {
    name: string;
    attributes: {
      value: string | number;
      trait_type: string;
      display_type?: string;
    }[];
  };
  queryUserQuantityOwned?: number;
};

export type TroveTokenWithQuantity = TroveToken & {
  quantity: number;
};

export type TroveTokenMapping = Record<string, Record<string, TroveToken>>;

type DomainType = "ens" | "smol" | "treasuretag" | "address";

type DomainInfo = {
  name: string;
  pfp: string | null;
  banner: string | null;
};

export type AccountDomains = {
  address: string;
  ens?: DomainInfo;
  smol?: DomainInfo;
  treasuretag?: DomainInfo;
  preferredDomainType?: DomainType;
};

/** Magicswap Objects */
export type PoolTokenCollection = {
  id: string;
  urlSlug: string;
  tokenIds: string[];
  name: string;
  symbol: string;
  type: "ERC721" | "ERC1155";
  image: string;
};

export type PoolToken = Omit<Token, "decimals"> & {
  type?: "ERC721" | "ERC1155";
  decimals: number;
  image?: string;
  collections: PoolTokenCollection[];
  urlSlug: string;
  collectionId: string;
  collectionTokenIds: string[];
  priceUSD: number;
  reserve: string;
};
