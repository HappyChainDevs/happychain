import type { ExecutionResult } from "graphql";

import { getCachedValue } from "~/lib/cache.server";
import { getOneWeekAgoTimestamp } from "~/lib/date.server";
import { ENV } from "~/lib/env.server";
import type { AccountDomains } from "~/types";
import { createPoolsFromPairs } from "./pools.server";
import {
  GetUserPositionsDocument,
  type GetUserPositionsQuery,
  execute,
} from ".graphclient";

export const fetchUserPositions = async (address: string | undefined) => {
  if (!address) {
    return {
      total: 0,
      positions: [],
    };
  }

  const result = (await execute(GetUserPositionsDocument, {
    id: address,
    dayDataWhere: {
      date_gte: getOneWeekAgoTimestamp(),
    },
  })) as ExecutionResult<GetUserPositionsQuery>;
  if (!result.data?.user) {
    return {
      total: 0,
      positions: [],
    };
  }

  const { user } = result.data;
  const pools = await createPoolsFromPairs(
    user.liquidityPositions.map(({ pair }) => pair),
  );
  const poolsMapping = pools.reduce(
    (acc, pool) => {
      acc[pool.id] = pool;
      return acc;
    },
    {} as Record<string, (typeof pools)[0]>,
  );

  return {
    total: Number(user.liquidityPositionCount),
    positions: user.liquidityPositions.map(({ balance, pair }) => ({
      balance,
      // biome-ignore lint/style/noNonNullAssertion: poolsMapping is created with keys from pairs directly above
      pool: poolsMapping[pair.id]!,
    })),
  };
};

export const fetchDomain = async (address: string) =>
  getCachedValue(`domain-${address}`, async () => {
    const response = await fetch(`${ENV.TROVE_API_URL}/domain/${address}`, {
      headers: {
        "X-API-Key": ENV.TROVE_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching domain: ${response.statusText}`);
    }

    const result = (await response.json()) as AccountDomains;
    return result;
  });

export const fetchDomains = async (addresses: string[]) => {
  const uniqueAddresses = [...new Set(addresses.filter((address) => address))];
  return getCachedValue(`domains-${uniqueAddresses.join(",")}`, async () => {
    const response = await fetch(`${ENV.TROVE_API_URL}/batch-domains`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": ENV.TROVE_API_KEY,
      },
      body: JSON.stringify({ addresses: uniqueAddresses }),
    });

    if (!response.ok) {
      throw new Error(`Error fetching domains: ${response.statusText}`);
    }

    const result = (await response.json()) as AccountDomains[];
    return result.reduce(
      (acc, domain) => {
        acc[domain.address] = domain;
        return acc;
      },
      {} as Record<string, AccountDomains>,
    );
  });
};
