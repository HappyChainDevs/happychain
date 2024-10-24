import { useCallback } from "react";

import { useAccount } from "~/contexts/account";
import {
  useReadErc20Allowance,
  useReadErc721IsApprovedForAll,
  useReadErc1155IsApprovedForAll,
} from "~/generated";
import type { AddressString, PoolToken } from "~/types";

type Props = {
  operator: AddressString;
  token: PoolToken | string;
  amount?: bigint;
  enabled?: boolean;
};

export const useIsApproved = ({
  operator,
  token,
  amount = 0n,
  enabled = true,
}: Props) => {
  const { address, addressArg } = useAccount();

  const isFullToken = typeof token !== "string";
  const tokenAddress = (isFullToken ? token.id : token) as AddressString;
  const collectionAddress = isFullToken
    ? (token.collectionId as AddressString)
    : undefined;
  const isERC721 = isFullToken && token.type === "ERC721";
  const isERC1155 = isFullToken && token.type === "ERC1155";
  const isEnabled = !!address && enabled;

  const { data: allowance, refetch: refetchAllowance } = useReadErc20Allowance({
    address: tokenAddress,
    args: [addressArg, operator],
    query: {
      enabled: isEnabled && !isERC721 && !isERC1155,
    },
  });

  const {
    data: erc721IsApprovedForAll,
    refetch: refetchERC721IsApprovedForAll,
  } = useReadErc721IsApprovedForAll({
    address: collectionAddress,
    args: [addressArg, operator],
    query: {
      enabled: isEnabled && !!collectionAddress && isERC721,
    },
  });

  const {
    data: erc1155IsApprovedForAll,
    refetch: refetchERC1155IsApprovedForAll,
  } = useReadErc1155IsApprovedForAll({
    address: collectionAddress,
    args: [addressArg, operator],
    query: {
      enabled: isEnabled && !!collectionAddress && isERC1155,
    },
  });

  const refetch = useCallback(() => {
    refetchAllowance();
    refetchERC721IsApprovedForAll();
    refetchERC1155IsApprovedForAll();
  }, [
    refetchAllowance,
    refetchERC721IsApprovedForAll,
    refetchERC1155IsApprovedForAll,
  ]);

  return {
    isApproved:
      !!erc721IsApprovedForAll ||
      !!erc1155IsApprovedForAll ||
      (!!allowance && allowance >= amount),
    allowance: allowance ?? 0n,
    refetch,
  };
};
