import { useEffect } from "react";

import { useWaitForTransactionReceipt } from "wagmi";
import { useAccount } from "~/contexts/account";
import {
  useWriteMagicSwapV2RouterSwapEthForExactTokens,
  useWriteMagicSwapV2RouterSwapEthForNft,
  useWriteMagicSwapV2RouterSwapExactEthForTokens,
  useWriteMagicSwapV2RouterSwapExactTokensForEth,
  useWriteMagicSwapV2RouterSwapExactTokensForTokens,
  useWriteMagicSwapV2RouterSwapNftForEth,
  useWriteMagicSwapV2RouterSwapNftForNft,
  useWriteMagicSwapV2RouterSwapNftForTokens,
  useWriteMagicSwapV2RouterSwapTokensForExactEth,
  useWriteMagicSwapV2RouterSwapTokensForExactTokens,
  useWriteMagicSwapV2RouterSwapTokensForNft,
} from "~/generated";
import { formatAmount } from "~/lib/currency";
import { bigIntToNumber } from "~/lib/number";
import { getAmountMax, getAmountMin } from "~/lib/pools";
import { DEFAULT_SLIPPAGE, useSettingsStore } from "~/store/settings";
import type {
  AddressString,
  Optional,
  PoolToken,
  TroveTokenWithQuantity,
} from "~/types";
import { useRouterAddress } from "./useContractAddress";
import { useToast } from "./useToast";
import type { Version } from ".graphclient";

type Props = {
  version: Version;
  tokenIn: PoolToken;
  tokenOut: Optional<PoolToken>;
  amountIn: bigint;
  amountOut: bigint;
  nftsIn: TroveTokenWithQuantity[];
  nftsOut: TroveTokenWithQuantity[];
  isExactOut: boolean;
  path: AddressString[];
  enabled?: boolean;
  onSuccess?: () => void;
};

export const useSwap = ({
  version,
  tokenIn,
  tokenOut,
  amountIn,
  amountOut,
  nftsIn,
  nftsOut,
  isExactOut,
  path,
  enabled = true,
  onSuccess,
}: Props) => {
  const { address, addressArg } = useAccount();
  const routerAddress = useRouterAddress(version);
  const state = useSettingsStore();

  const isEnabled = enabled && !!address && !!tokenOut;
  const amountInMax = isExactOut
    ? getAmountMax(amountIn, state?.slippage || DEFAULT_SLIPPAGE)
    : amountIn;
  const amountOutMin = isExactOut
    ? amountOut
    : getAmountMin(amountOut, state?.slippage || DEFAULT_SLIPPAGE);
  const collectionsIn = nftsIn.map(
    ({ collectionAddr }) => collectionAddr as AddressString,
  );
  const tokenIdsIn = nftsIn.map(({ tokenId }) => BigInt(tokenId));
  const quantitiesIn = nftsIn.map(({ quantity }) => BigInt(quantity));
  const collectionsOut = nftsOut.map(
    ({ collectionAddr }) => collectionAddr as AddressString,
  );
  const tokenIdsOut = nftsOut.map(({ tokenId }) => BigInt(tokenId));
  const quantitiesOut = nftsOut.map(({ quantity }) => BigInt(quantity));
  const deadline = BigInt(
    Math.floor(Date.now() / 1000) + (state?.deadline || 30) * 60,
  );

  const swapExactTokensForTokens =
    useWriteMagicSwapV2RouterSwapExactTokensForTokens();
  const swapExactTokensForTokensReceipt = useWaitForTransactionReceipt({
    hash: swapExactTokensForTokens.data,
  });

  const swapTokensForExactTokens =
    useWriteMagicSwapV2RouterSwapTokensForExactTokens();
  const swapTokensForExactTokensReceipt = useWaitForTransactionReceipt({
    hash: swapTokensForExactTokens.data,
  });

  const swapExactTokensForETH =
    useWriteMagicSwapV2RouterSwapExactTokensForEth();
  const swapExactTokensForETHReceipt = useWaitForTransactionReceipt({
    hash: swapExactTokensForETH.data,
  });

  const swapTokensForExactETH =
    useWriteMagicSwapV2RouterSwapTokensForExactEth();
  const swapTokensForExactETHReceipt = useWaitForTransactionReceipt({
    hash: swapTokensForExactETH.data,
  });

  const swapETHForExactTokens =
    useWriteMagicSwapV2RouterSwapEthForExactTokens();
  const swapETHForExactTokensReceipt = useWaitForTransactionReceipt({
    hash: swapETHForExactTokens.data,
  });

  const swapExactETHForTokens =
    useWriteMagicSwapV2RouterSwapExactEthForTokens();
  const swapExactETHForTokensReceipt = useWaitForTransactionReceipt({
    hash: swapExactETHForTokens.data,
  });

  const swapTokensForNFT = useWriteMagicSwapV2RouterSwapTokensForNft();
  const swapTokensForNFTReceipt = useWaitForTransactionReceipt({
    hash: swapTokensForNFT.data,
  });

  const swapNFTForTokens = useWriteMagicSwapV2RouterSwapNftForTokens();
  const swapNFTForTokensReceipt = useWaitForTransactionReceipt({
    hash: swapNFTForTokens.data,
  });

  const swapETHForNFT = useWriteMagicSwapV2RouterSwapEthForNft();
  const swapETHForNFTReceipt = useWaitForTransactionReceipt({
    hash: swapETHForNFT.data,
  });

  const swapNFTForETH = useWriteMagicSwapV2RouterSwapNftForEth();
  const swapNFTForETHReceipt = useWaitForTransactionReceipt({
    hash: swapNFTForETH.data,
  });

  const swapNFTForNFT = useWriteMagicSwapV2RouterSwapNftForNft();
  const swapNFTForNFTReceipt = useWaitForTransactionReceipt({
    hash: swapNFTForNFT.data,
  });

  const isSuccess =
    swapExactTokensForTokensReceipt.isSuccess ||
    swapTokensForExactTokensReceipt.isSuccess ||
    swapExactTokensForETHReceipt.isSuccess ||
    swapTokensForExactETHReceipt.isSuccess ||
    swapETHForExactTokensReceipt.isSuccess ||
    swapExactETHForTokensReceipt.isSuccess ||
    swapTokensForNFTReceipt.isSuccess ||
    swapNFTForTokensReceipt.isSuccess ||
    swapETHForNFTReceipt.isSuccess ||
    swapNFTForETHReceipt.isSuccess ||
    swapNFTForNFTReceipt.isSuccess;

  useToast({
    title: `Swap ${formatAmount(bigIntToNumber(amountIn))} ${
      tokenIn.symbol
    } for ${formatAmount(bigIntToNumber(amountOut))} ${tokenOut?.symbol}`,
    isLoading:
      swapExactTokensForTokens.isPending ||
      swapExactTokensForTokensReceipt.isLoading ||
      swapTokensForExactTokens.isPending ||
      swapTokensForExactTokensReceipt.isLoading ||
      swapExactTokensForETH.isPending ||
      swapExactTokensForETHReceipt.isLoading ||
      swapTokensForExactETH.isPending ||
      swapTokensForExactETHReceipt.isLoading ||
      swapETHForExactTokens.isPending ||
      swapETHForExactTokensReceipt.isLoading ||
      swapExactETHForTokens.isPending ||
      swapExactETHForTokensReceipt.isLoading ||
      swapTokensForNFT.isPending ||
      swapTokensForNFTReceipt.isLoading ||
      swapNFTForTokens.isPending ||
      swapNFTForTokensReceipt.isLoading ||
      swapETHForNFT.isPending ||
      swapETHForNFTReceipt.isLoading ||
      swapNFTForETH.isPending ||
      swapNFTForETHReceipt.isLoading ||
      swapNFTForNFT.isPending ||
      swapNFTForNFTReceipt.isLoading,
    isSuccess,
    isError:
      swapExactTokensForTokens.isError ||
      swapExactTokensForTokensReceipt.isError ||
      swapTokensForExactTokens.isError ||
      swapTokensForExactTokensReceipt.isError ||
      swapExactTokensForETH.isError ||
      swapExactTokensForETHReceipt.isError ||
      swapTokensForExactETH.isError ||
      swapTokensForExactETHReceipt.isError ||
      swapETHForExactTokens.isError ||
      swapETHForExactTokensReceipt.isError ||
      swapExactETHForTokens.isError ||
      swapExactETHForTokensReceipt.isError ||
      swapTokensForNFT.isError ||
      swapTokensForNFTReceipt.isError ||
      swapNFTForTokens.isError ||
      swapNFTForTokensReceipt.isError ||
      swapETHForNFT.isError ||
      swapETHForNFTReceipt.isError ||
      swapNFTForETH.isError ||
      swapNFTForETHReceipt.isError ||
      swapNFTForNFT.isError ||
      swapNFTForNFTReceipt.isError,
    errorDescription: (
      swapExactTokensForTokens.error ||
      swapExactTokensForTokensReceipt.error ||
      swapTokensForExactTokens.error ||
      swapTokensForExactTokensReceipt.error ||
      swapExactTokensForETH.error ||
      swapExactTokensForETHReceipt.error ||
      swapTokensForExactETH.error ||
      swapTokensForExactETHReceipt.error ||
      swapETHForExactTokens.error ||
      swapETHForExactTokensReceipt.error ||
      swapExactETHForTokens.error ||
      swapExactETHForTokensReceipt.error ||
      swapTokensForNFT.error ||
      swapTokensForNFTReceipt.error ||
      swapNFTForTokens.error ||
      swapNFTForTokensReceipt.error ||
      swapETHForNFT.error ||
      swapETHForNFTReceipt.error ||
      swapNFTForETH.error ||
      swapNFTForETHReceipt.error ||
      swapNFTForNFT.error ||
      swapNFTForNFTReceipt.error
    )?.message,
  });

  useEffect(() => {
    if (isSuccess) {
      onSuccess?.();
    }
  }, [isSuccess, onSuccess]);

  return {
    amountInMax,
    amountOutMin,
    swap: () => {
      if (!isEnabled) {
        return;
      }

      if (tokenIn.isNFT && tokenOut.isNFT) {
        // NFT-NFT
        return swapNFTForNFT.writeContractAsync({
          address: routerAddress,
          args: [
            collectionsIn,
            tokenIdsIn,
            quantitiesIn,
            collectionsOut,
            tokenIdsOut,
            quantitiesOut,
            path,
            addressArg,
            deadline,
          ],
        });
      }

      if (tokenIn.isNFT) {
        if (tokenOut.isETH) {
          // NFT-ETH
          return swapNFTForETH.writeContractAsync({
            address: routerAddress,
            args: [
              collectionsIn,
              tokenIdsIn,
              quantitiesIn,
              amountOutMin,
              path,
              addressArg,
              deadline,
            ],
          });
        }

        // NFT-ERC20
        return swapNFTForTokens.writeContractAsync({
          address: routerAddress,
          args: [
            collectionsIn,
            tokenIdsIn,
            quantitiesIn,
            amountOutMin,
            path,
            addressArg,
            deadline,
          ],
        });
      }

      if (tokenOut.isNFT) {
        if (tokenIn.isETH) {
          // ETH-NFT
          return swapETHForNFT.writeContractAsync({
            address: routerAddress,
            args: [
              collectionsOut,
              tokenIdsOut,
              quantitiesOut,
              path,
              addressArg,
              deadline,
            ],
            value: amountInMax,
          });
        }

        // ERC20-NFT
        return swapTokensForNFT.writeContractAsync({
          address: routerAddress,
          args: [
            collectionsOut,
            tokenIdsOut,
            quantitiesOut,
            amountInMax,
            path,
            addressArg,
            deadline,
          ],
        });
      }

      if (tokenIn.isETH) {
        // ETH-ERC20 exact out
        if (isExactOut) {
          return swapETHForExactTokens.writeContractAsync({
            address: routerAddress,
            args: [amountOut, path, addressArg, deadline],
            value: amountInMax,
          });
        }

        // ETH-ERC20 exact in
        return swapExactETHForTokens.writeContractAsync({
          address: routerAddress,
          args: [amountOutMin, path, addressArg, deadline],
          value: amountIn,
        });
      }

      if (tokenOut.isETH) {
        // ERC20-ETH exact out
        if (isExactOut) {
          return swapTokensForExactETH.writeContractAsync({
            address: routerAddress,
            args: [amountOut, amountInMax, path, addressArg, deadline],
          });
        }

        // ERC20-ETH exact in
        return swapExactTokensForETH.writeContractAsync({
          address: routerAddress,
          args: [amountIn, amountOutMin, path, addressArg, deadline],
        });
      }

      // ERC20-ERC20 exact out
      if (isExactOut) {
        return swapTokensForExactTokens.writeContractAsync({
          address: routerAddress,
          args: [amountOut, amountInMax, path, addressArg, deadline],
        });
      }

      // ERC20-ERC20 exact in
      return swapExactTokensForTokens.writeContractAsync({
        address: routerAddress,
        args: [amountIn, amountOutMin, path, addressArg, deadline],
      });
    },
  };
};
