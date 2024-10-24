import type {
  Collection,
  PoolTokenCollection,
  TroveCollectionMapping,
} from "~/types";
import { truncateEthAddress } from "./address";

export const createPoolTokenCollection = (
  collection: Collection,
  tokenIds: string[],
  collectionMapping: TroveCollectionMapping,
): PoolTokenCollection => {
  const {
    urlSlug = "",
    displayName: name = truncateEthAddress(collection.id),
    symbol = "?",
    contractType: type = "ERC721",
    thumbnailUri: image = "",
  } = collectionMapping[collection.id] ?? {};
  return {
    id: collection.id,
    urlSlug,
    tokenIds,
    name,
    symbol,
    type,
    image,
  };
};
