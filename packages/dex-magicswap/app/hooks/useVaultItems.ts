import { useFetcher } from "@remix-run/react";
import { useEffect, useState } from "react";

import type { FetchVaultItems } from "~/routes/resources.vaults.$id.items";
import type { TroveToken } from "~/types";

type Props = {
  id: string;
  type: "reserves" | "inventory";
  address?: string;
  resultsPerPage?: number;
  enabled?: boolean;
};

const DEFAULT_STATE = {
  results: [],
  page: 1,
  hasNextPage: false,
  isLoading: false,
  error: undefined,
};

export const useVaultItems = ({
  id,
  type,
  address,
  resultsPerPage = 25,
  enabled = true,
}: Props) => {
  const { load, state, data } = useFetcher<FetchVaultItems>();
  const [{ results, page, hasNextPage, isLoading, error }, setState] =
    useState<{
      results: TroveToken[];
      page: number;
      hasNextPage: boolean;
      isLoading: boolean;
      error: string | undefined;
    }>(DEFAULT_STATE);

  useEffect(() => {
    if (data?.ok) {
      setState((curr) => ({
        ...curr,
        results:
          curr.page === 1 ? data.results : [...curr.results, ...data.results],
        hasNextPage: data.results.length === resultsPerPage,
        isLoading: false,
        error: undefined,
      }));
    } else if (data?.error) {
      setState({ ...DEFAULT_STATE, error: data.error });
    }
  }, [data, resultsPerPage]);

  useEffect(() => {
    if (enabled) {
      const params = new URLSearchParams({
        type,
        page: page.toString(),
        resultsPerPage: resultsPerPage.toString(),
      });

      if (type === "inventory" && address) {
        params.set("address", address);
      }

      setState((curr) => ({ ...curr, isLoading: true }));
      load(`/resources/vaults/${id}/items?${params.toString()}`);
    } else {
      setState(DEFAULT_STATE);
    }
  }, [enabled, id, type, address, page, resultsPerPage, load]);

  return {
    isLoading: isLoading || state === "loading",
    results,
    page,
    hasNextPage,
    loadNextPage: () =>
      setState((curr) => ({ ...curr, isLoading: true, page: curr.page + 1 })),
    refetch: () => setState({ ...DEFAULT_STATE, isLoading: true }),
    error,
  };
};
