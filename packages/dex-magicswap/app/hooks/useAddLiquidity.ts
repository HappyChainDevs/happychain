import { useEffect } from "react";

import { useWaitForTransactionReceipt } from "wagmi";
import { useAccount } from "~/contexts/account";
import {
  useWriteMagicSwapV2RouterAddLiquidity,
  useWriteMagicSwapV2RouterAddLiquidityEth,
  useWriteMagicSwapV2RouterAddLiquidityNft,
  useWriteMagicSwapV2RouterAddLiquidityNfteth,
  useWriteMagicSwapV2RouterAddLiquidityNftnft,
} from "~/generated";
import type { Pool } from "~/lib/pools.server";
import { useSettingsStore } from "~/store/settings";
import type { AddressString, TroveTokenWithQuantity } from "~/types";
import { useRouterAddress } from "./useContractAddress";
import { useToast } from "./useToast";

type Props = {
  pool: Pool;
  amount0: bigint;
  amount1: bigint;
  amount0Min: bigint;
  amount1Min: bigint;
  nfts0: TroveTokenWithQuantity[];
  nfts1: TroveTokenWithQuantity[];
  isExact1: boolean;
  enabled?: boolean;
  onSuccess?: () => void;
};

export const useAddLiquidity = ({
  pool,
  amount0,
  amount1,
  amount0Min,
  amount1Min,
  nfts0,
  nfts1,
  isExact1,
  enabled = true,
  onSuccess,
}: Props) => {
  const { address, addressArg } = useAccount();
  const routerAddress = useRouterAddress(pool.version);
  const deadlineMinutes = useSettingsStore((state) => state.deadline);

  const isEnabled = enabled && !!address;
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineMinutes * 60);

  const addLiquidity = useWriteMagicSwapV2RouterAddLiquidity();
  const addLiquidityReceipt = useWaitForTransactionReceipt({
    hash: addLiquidity.data,
  });

  const addLiquidityETH = useWriteMagicSwapV2RouterAddLiquidityEth();
  const addLiquidityETHReceipt = useWaitForTransactionReceipt({
    hash: addLiquidityETH.data,
  });

  const addLiquidityNFT = useWriteMagicSwapV2RouterAddLiquidityNft();
  const addLiquidityNFTReceipt = useWaitForTransactionReceipt({
    hash: addLiquidityNFT.data,
  });

  const addLiquidityNFTETH = useWriteMagicSwapV2RouterAddLiquidityNfteth();
  const addLiquidityNFTETHReceipt = useWaitForTransactionReceipt({
    hash: addLiquidityNFTETH.data,
  });

  const addLiquidityNFTNFT = useWriteMagicSwapV2RouterAddLiquidityNftnft();
  const addLiquidityNFTNFTReceipt = useWaitForTransactionReceipt({
    hash: addLiquidityNFTNFT.data,
  });

  const isSuccess =
    addLiquidityReceipt.isSuccess ||
    addLiquidityETHReceipt.isSuccess ||
    addLiquidityNFTReceipt.isSuccess ||
    addLiquidityNFTETHReceipt.isSuccess ||
    addLiquidityNFTNFTReceipt.isSuccess;

  useToast({
    title: `Add liquidity to ${pool.name}`,
    isLoading:
      addLiquidity.isPending ||
      addLiquidityReceipt.isLoading ||
      addLiquidityETH.isPending ||
      addLiquidityETHReceipt.isLoading ||
      addLiquidityNFT.isPending ||
      addLiquidityNFTReceipt.isLoading ||
      addLiquidityNFTETH.isPending ||
      addLiquidityNFTETHReceipt.isLoading ||
      addLiquidityNFTNFT.isPending ||
      addLiquidityNFTNFTReceipt.isLoading,
    isSuccess,
    isError:
      addLiquidity.isError ||
      addLiquidityReceipt.isError ||
      addLiquidityETH.isError ||
      addLiquidityETHReceipt.isError ||
      addLiquidityNFT.isError ||
      addLiquidityNFTReceipt.isError ||
      addLiquidityNFTETH.isError ||
      addLiquidityNFTETHReceipt.isError ||
      addLiquidityNFTNFT.isError ||
      addLiquidityNFTNFTReceipt.isError,
    errorDescription: (
      addLiquidity.error ||
      addLiquidityReceipt.error ||
      addLiquidityETH.error ||
      addLiquidityETHReceipt.error ||
      addLiquidityNFT.error ||
      addLiquidityNFTReceipt.error ||
      addLiquidityNFTETH.error ||
      addLiquidityNFTETHReceipt.error ||
      addLiquidityNFTNFT.error ||
      addLiquidityNFTNFTReceipt.error
    )?.message,
  });

  useEffect(() => {
    if (isSuccess) {
      onSuccess?.();
    }
  }, [isSuccess, onSuccess]);

  const isTokenAToken1 =
    isExact1 ||
    pool.token1.isETH ||
    (pool.token1.isNFT && !pool.isNFTNFT && !pool.token0.isETH);
  const tokenA = (
    isTokenAToken1 ? pool.token1.id : pool.token0.id
  ) as AddressString;
  const tokenB = (
    isTokenAToken1 ? pool.token0.id : pool.token1.id
  ) as AddressString;
  const amountA = isTokenAToken1 ? amount1 : amount0;
  const amountB = isTokenAToken1 ? amount0 : amount1;
  const amountAMin = isTokenAToken1 ? amount1Min : amount0Min;
  const amountBMin = isTokenAToken1 ? amount0Min : amount1Min;
  const nftsA = isTokenAToken1 ? nfts1 : nfts0;
  const nftsB = isTokenAToken1 ? nfts0 : nfts1;
  return {
    addLiquidity: () => {
      if (!isEnabled) {
        return;
      }

      if (pool.isNFTNFT) {
        // NFT-NFT
        return addLiquidityNFTNFT.writeContractAsync({
          address: routerAddress,
          args: [
            {
              token: tokenA,
              collection: nftsA.map(
                ({ collectionAddr }) => collectionAddr as AddressString,
              ),
              tokenId: nftsA.map(({ tokenId }) => BigInt(tokenId)),
              amount: nftsA.map(({ quantity }) => BigInt(quantity)),
            },
            {
              token: tokenB,
              collection: nftsB.map(
                ({ collectionAddr }) => collectionAddr as AddressString,
              ),
              tokenId: nftsB.map(({ tokenId }) => BigInt(tokenId)),
              amount: nftsB.map(({ quantity }) => BigInt(quantity)),
            },
            amountAMin,
            amountBMin,
            addressArg,
            deadline,
          ],
        });
      }

      if (pool.hasNFT) {
        if (pool.token0.isETH || pool.token1.isETH) {
          // NFT-ETH
          return addLiquidityNFTETH.writeContractAsync({
            address: routerAddress,
            args: [
              {
                token: tokenB,
                collection: nftsB.map(
                  ({ collectionAddr }) => collectionAddr as AddressString,
                ),
                tokenId: nftsB.map(({ tokenId }) => BigInt(tokenId)),
                amount: nftsB.map(({ quantity }) => BigInt(quantity)),
              },
              amountA,
              addressArg,
              deadline,
            ],
            value: amountA,
          });
        }

        // NFT-ERC20
        return addLiquidityNFT.writeContractAsync({
          address: routerAddress,
          args: [
            {
              token: tokenA,
              collection: nftsA.map(
                ({ collectionAddr }) => collectionAddr as AddressString,
              ),
              tokenId: nftsA.map(({ tokenId }) => BigInt(tokenId)),
              amount: nftsA.map(({ quantity }) => BigInt(quantity)),
            },
            tokenB,
            amountB,
            amountBMin,
            addressArg,
            deadline,
          ],
        });
      }

      if (pool.token0.isETH || pool.token1.isETH) {
        // ERC20-ETH
        return addLiquidityETH.writeContractAsync({
          address: routerAddress,
          args: [tokenB, amountB, amountBMin, amountA, addressArg, deadline],
          value: amountA,
        });
      }

      // ERC20-ERC20
      return addLiquidity.writeContractAsync({
        address: routerAddress,
        args: [
          tokenA,
          tokenB,
          amountA,
          amountB,
          amountAMin,
          amountBMin,
          addressArg,
          deadline,
        ],
      });
    },
  };
};
