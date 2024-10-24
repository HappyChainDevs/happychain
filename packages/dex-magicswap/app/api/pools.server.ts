import type { ExecutionResult } from "graphql";

import { BLOCKED_PAIRS } from "~/consts";
import { uniswapV2PairAbi } from "~/generated";
import { client } from "~/lib/chain.server";
import {
  getOneDayAgoTimestamp,
  getOneWeekAgoTimestamp,
} from "~/lib/date.server";
import { createPoolFromPair } from "~/lib/pools.server";
import { itemToTroveTokenItem } from "~/lib/tokens.server";
import type { AddressString, Pair } from "~/types";
import {
  GetPairDocument,
  type GetPairQuery,
  GetPairTransactionsDocument,
  type GetPairTransactionsQuery,
  GetPairsDocument,
  type GetPairsQuery,
  type TransactionType,
  execute,
} from "../../.graphclient";
import { fetchTokensCollections } from "./collections.server";
import { fetchMagicUSD } from "./stats.server";
import { fetchTroveTokenMapping } from "./tokens.server";
import { fetchDomains } from "./user.server";

export const fetchPoolTransactions = async ({
  id,
  page = 1,
  resultsPerPage = 25,
  type,
}: {
  id: string;
  page?: number;
  resultsPerPage?: number;
  type?: TransactionType;
}) => {
  const result = (await execute(GetPairTransactionsDocument, {
    pair: id,
    first: resultsPerPage,
    skip: (page - 1) * resultsPerPage,
    ...(type ? { where: { type } } : undefined),
  })) as ExecutionResult<GetPairTransactionsQuery>;
  const { pair } = result.data ?? {};
  if (!pair) {
    throw new Error(`Pair not found: ${id}`);
  }

  const transactions = pair.transactions;
  const [tokens, domains] = await Promise.all([
    fetchTroveTokenMapping([
      ...new Set(
        transactions.flatMap(({ items }) =>
          items.map(({ collection, tokenId }) => `${collection.id}/${tokenId}`),
        ),
      ),
    ]),
    fetchDomains(transactions.map(({ user }) => user?.id ?? "")),
  ]);

  return transactions.map(({ items, ...transaction }) => ({
    ...transaction,
    userDomain: transaction.user ? domains[transaction.user.id] : undefined,
    items0:
      items
        ?.filter(({ vault }) => vault.id === pair.token0.id)
        .map((item) => itemToTroveTokenItem(item, tokens)) ?? [],
    items1:
      items
        ?.filter(({ vault }) => vault.id === pair.token1.id)
        .map((item) => itemToTroveTokenItem(item, tokens)) ?? [],
  }));
};

type PoolTransaction = Awaited<
  ReturnType<typeof fetchPoolTransactions>
>[number];
export type PoolTransactionType = NonNullable<PoolTransaction["type"]>;
export type PoolTransactionItem = PoolTransaction["items0"][number];

export const createPoolsFromPairs = async (pairs: Pair[]) => {
  const [[collectionMapping, tokenMapping], magicUSD, reserves] =
    await Promise.all([
      fetchTokensCollections(
        pairs.flatMap(({ token0, token1 }) => [token0, token1]),
      ),
      fetchMagicUSD(),
      client.multicall({
        contracts: pairs.map(({ id }) => ({
          address: id as AddressString,
          abi: uniswapV2PairAbi,
          functionName: "getReserves",
        })),
      }),
    ]);
  return pairs.map((pair, i) => {
    const reserve = reserves[i] as {
      result: [bigint, bigint, number];
      status: "success" | "reverted";
    };
    return createPoolFromPair(
      pair,
      collectionMapping,
      tokenMapping,
      magicUSD,
      reserve?.status === "success"
        ? [reserve.result[0], reserve.result[1]]
        : undefined,
    );
  });
};

export const fetchPools = async () => {
  const result = (await execute(GetPairsDocument, {
    where: {
      id_not_in: BLOCKED_PAIRS,
      reserve0_gt: 0,
    },
    hourDataWhere: { date_gte: getOneDayAgoTimestamp() },
    dayDataWhere: {
      date_gte: getOneWeekAgoTimestamp(),
    },
  })) as ExecutionResult<GetPairsQuery>;
  const { pairs = [] } = result.data ?? {};
  return createPoolsFromPairs(pairs);
};

export const fetchPool = async (id: string) => {
  const result = (await execute(GetPairDocument, {
    id,
    hourDataWhere: { date_gte: getOneDayAgoTimestamp() },
    dayDataWhere: {
      date_gte: getOneWeekAgoTimestamp(),
    },
  })) as ExecutionResult<GetPairQuery>;
  const pair = result.data?.pair;
  if (!pair) {
    return undefined;
  }

  const pools = await createPoolsFromPairs([pair]);
  return pools[0];
};
