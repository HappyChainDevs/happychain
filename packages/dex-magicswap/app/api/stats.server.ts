import type { ExecutionResult } from "graphql";

import { GetStatsDocument, type GetStatsQuery, execute } from ".graphclient";

const fetchStats = async () => {
  const result = (await execute(
    GetStatsDocument,
    {},
  )) as ExecutionResult<GetStatsQuery>;
  const { globals = [], factories = [] } = result.data ?? {};
  return {
    ...globals[0],
    ...factories[0],
  };
};

export const fetchMagicUSD = async () => {
  const stats = await fetchStats();
  return Number(stats?.magicUSD ?? 0);
};
