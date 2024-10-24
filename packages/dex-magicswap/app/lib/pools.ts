import type { NetworkInfo } from "@sushiswap/tines";
import {
  ConstantProductRPool,
  findMultiRouteExactIn,
  findMultiRouteExactOut,
} from "@sushiswap/tines";
import { parseUnits } from "viem";

import type { AddressString, PoolToken } from "~/types";
import { formatAmount, formatUSD } from "./currency";
import type { Pool } from "./pools.server";
import { tokenToRToken } from "./tokens";

export const quote = (amountA: bigint, reserveA: bigint, reserveB: bigint) =>
  reserveA > 0 ? (amountA * reserveB) / reserveA : 0n;

export const getLpCountForTokens = (
  amount: bigint,
  reserve: bigint,
  totalSupply: bigint,
) => (reserve > 0 ? (amount * totalSupply) / reserve : 0n);

export const getTokenCountForLp = (
  amount: bigint,
  reserve: bigint,
  totalSupply: bigint,
) => (totalSupply > 0 ? (amount * reserve) / totalSupply : 0n);

export const getAmountMax = (amount: bigint, slippage: number) =>
  amount + (amount * BigInt(Math.ceil(slippage * 1000))) / 1000n;

export const getAmountMin = (amount: bigint, slippage: number) =>
  amount - (amount * BigInt(Math.ceil(slippage * 1000))) / 1000n;

export const createSwapRoute = (
  tokenIn: PoolToken,
  tokenOut: PoolToken | null,
  pools: Pool[],
  amount: bigint,
  isExactOut: boolean,
) => {
  if (amount <= 0 || !tokenOut) {
    return undefined;
  }

  const rTokenIn = tokenToRToken(tokenIn);
  const rTokenOut = tokenToRToken(tokenOut);
  const rPools = pools.map(
    ({ id, token0, token1, reserve0, reserve1, totalFee }) => {
      return new ConstantProductRPool(
        id as AddressString,
        tokenToRToken(token0),
        tokenToRToken(token1),
        Number(totalFee ?? 0),
        parseUnits(reserve0.toString(), token0.decimals),
        parseUnits(reserve1.toString(), token0.decimals),
      );
    },
  );
  const networks: NetworkInfo[] = [
    {
      baseToken: {
        name: "ETH",
        symbol: "ETH",
        address: "0x0",
        decimals: 18,
      },
      gasPrice: 0,
    },
  ];

  if (isExactOut) {
    return findMultiRouteExactOut(
      rTokenIn,
      rTokenOut,
      amount,
      rPools,
      networks,
    );
  }

  return findMultiRouteExactIn(rTokenIn, rTokenOut, amount, rPools, networks);
};

export const getPoolVolume24hDisplay = (pool: Pool) => {
  if (!pool.volume24hUSD) {
    if (pool.isNFTNFT || !pool.token0.isNFT) {
      return `${formatAmount(pool.volume24h0, { type: "compact" })} ${pool.token0.symbol}`;
    }

    return `${formatAmount(pool.volume24h1, { type: "compact" })} ${pool.token1.symbol}`;
  }

  return formatUSD(pool.volume24hUSD);
};

export const getPoolReserveDisplay = (pool: Pool) => {
  if (!pool.reserveUSD) {
    if (pool.isNFTNFT || !pool.token0.isNFT) {
      return `${formatAmount(BigInt(pool.token0.reserve) * 2n, { decimals: pool.token0.decimals, type: "compact" })} ${pool.token0.symbol}`;
    }

    return `${formatAmount(BigInt(pool.token1.reserve) * 2n, { decimals: pool.token1.decimals, type: "compact" })} ${pool.token1.symbol}`;
  }

  return formatUSD(pool.reserveUSD);
};

export const getPoolFeesDisplay = (pool: Pool) => {
  const fee = Number(pool.lpFee);
  if (!pool.volumeUSD) {
    if (pool.isNFTNFT || !pool.token0.isNFT) {
      return `${formatAmount(pool.volume0 * fee, { type: "compact" })} ${pool.token0.symbol}`;
    }

    return `${formatAmount(pool.volume1 * fee, { type: "compact" })} ${pool.token1.symbol}`;
  }

  return formatUSD(pool.volumeUSD * fee);
};

export const getPoolFees24hDisplay = (pool: Pool) => {
  const fee = Number(pool.lpFee);
  if (!pool.volume24hUSD) {
    if (pool.isNFTNFT || !pool.token0.isNFT) {
      return `${formatAmount(pool.volume24h0 * fee, { type: "compact" })} ${pool.token0.symbol}`;
    }

    return `${formatAmount(pool.volume24h1 * fee, { type: "compact" })} ${pool.token1.symbol}`;
  }

  return formatUSD(pool.volume24hUSD * fee);
};
