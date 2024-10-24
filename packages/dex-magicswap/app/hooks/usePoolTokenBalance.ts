import { useFetcher } from "@remix-run/react";
import { useEffect } from "react";

import type { FetchNFTVaultBalance } from "~/routes/resources.vaults.$id.balance";
import type { AddressString, PoolToken } from "~/types";
import { useTokenBalance } from "./useTokenBalance";

type Props = {
  token: PoolToken;
  address: AddressString | undefined;
};

export const usePoolTokenBalance = ({ token, address }: Props) => {
  const {
    load: loadNFTBalance,
    state: nftBalanceStatus,
    data: nftBalance,
  } = useFetcher<FetchNFTVaultBalance>();

  const { data: erc20Balance = 0n, isLoading } = useTokenBalance({
    id: token.id as AddressString,
    address,
    isETH: token.isETH,
    enabled: !!address && !token.isNFT,
  });

  useEffect(() => {
    if (!token.isNFT || !address) {
      return;
    }

    const params = new URLSearchParams({
      address,
    });
    loadNFTBalance(
      `/resources/vaults/${token.id}/balance?${params.toString()}`,
    );
  }, [token.isNFT, token.id, address, loadNFTBalance]);

  return {
    data: token.isNFT
      ? nftBalance?.ok
        ? nftBalance.balance
        : 0
      : erc20Balance,
    isLoading: isLoading || nftBalanceStatus === "loading",
  };
};
