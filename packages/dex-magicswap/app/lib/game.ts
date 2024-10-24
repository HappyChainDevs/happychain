import { GAME_METADATA } from "~/consts";

const getTokenIdsForGame = (id: string, chainId: number) =>
  GAME_METADATA[id]?.tokens[chainId]?.map((id) => id.toLowerCase()) ?? [];

export const getTokenIdsMapForGame = (id: string, chainId: number) =>
  getTokenIdsForGame(id, chainId).reduce(
    (acc, id) => {
      acc[id.toLowerCase()] = true;
      return acc;
    },
    {} as Record<string, boolean>,
  );

const getCollectionIdsForGame = (id: string, chainId: number) =>
  GAME_METADATA[id]?.collections[chainId]?.map((id) => id.toLowerCase()) ?? [];

export const getCollectionIdsMapForGame = (id: string, chainId: number) =>
  getCollectionIdsForGame(id, chainId).reduce(
    (acc, id) => {
      acc[id] = true;
      return acc;
    },
    {} as Record<string, boolean>,
  );
