import { parseUnits } from "viem";

import type {
  NumberString,
  Pair,
  TroveCollectionMapping,
  TroveTokenMapping,
} from "~/types";
import { aprToApy } from "./apr";
import { bigIntToNumber } from "./number";
import { createPoolToken } from "./tokens.server";

export const createPoolFromPair = (
  pair: Pair,
  collectionMapping: TroveCollectionMapping,
  tokenMapping: TroveTokenMapping,
  magicUSD: number,
  reserves?: [bigint, bigint],
) => {
  const token0 = {
    ...createPoolToken(pair.token0, collectionMapping, tokenMapping, magicUSD),
    reserve: (
      reserves?.[0] ??
      parseUnits(pair.reserve0 as NumberString, Number(pair.token0.decimals))
    ).toString(),
  };
  const token1 = {
    ...createPoolToken(pair.token1, collectionMapping, tokenMapping, magicUSD),
    reserve: (
      reserves?.[1] ??
      parseUnits(pair.reserve1 as NumberString, Number(pair.token1.decimals))
    ).toString(),
  };

  const isNFTNFT = token0.isNFT && token1.isNFT;
  const collections = [token0.collections, token1.collections].flat();
  const reserveUSD = Number(pair.reserveUSD);

  const volume1wUSD =
    pair.dayData?.reduce(
      (total, { volumeUSD }) => total + Number(volumeUSD),
      0,
    ) ?? 0;
  const volume1w0 =
    pair.dayData?.reduce((total, { volume0 }) => total + Number(volume0), 0) ??
    0;
  const volume1w1 =
    pair.dayData?.reduce((total, { volume1 }) => total + Number(volume1), 0) ??
    0;
  const volume1w = isNFTNFT || !token0.isNFT ? volume1w0 : volume1w1;

  const aprReserve =
    isNFTNFT || !token0.isNFT
      ? bigIntToNumber(BigInt(token0.reserve))
      : bigIntToNumber(BigInt(token1.reserve));
  const apr =
    aprReserve > 0
      ? ((volume1w / 7) * 365 * Number(pair.lpFee)) / aprReserve
      : 0;

  return {
    ...pair,
    name:
      (token0.isNFT && !token1.isNFT) || token1.isMAGIC
        ? `${token1.symbol} / ${token0.symbol}`
        : `${token0.symbol} / ${token1.symbol}`,
    token0,
    token1,
    hasNFT: token0.isNFT || token1.isNFT,
    isNFTNFT,
    collections: collections.filter(
      (value, index, self) =>
        index ===
        self.findIndex((t) => t.id.toLowerCase() === value.id.toLowerCase()),
    ),
    reserveUSD,
    volume0: Number(pair.volume0),
    volume1: Number(pair.volume1),
    volumeUSD: Number(pair.volumeUSD),
    volume24h0:
      pair.hourData?.reduce(
        (total, { volume0 }) => total + Number(volume0),
        0,
      ) ?? 0,
    volume24h1:
      pair.hourData?.reduce(
        (total, { volume1 }) => total + Number(volume1),
        0,
      ) ?? 0,
    volume24hUSD:
      pair.hourData?.reduce(
        (total, { volumeUSD }) => total + Number(volumeUSD),
        0,
      ) ?? 0,
    volume1wUSD,
    apy: aprToApy(apr),
  };
};

export type Pool = ReturnType<typeof createPoolFromPair>;
