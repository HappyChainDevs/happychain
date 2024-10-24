import type { HTMLAttributes } from "react";

import type { SwapRoute } from "~/hooks/useSwapRoute";
import { formatAmount } from "~/lib/currency";
import { ceilBigInt, floorBigInt, formatPercent } from "~/lib/number";
import { cn } from "~/lib/utils";
import { InfoPopover } from "../ui/InfoPopover";

type Props = HTMLAttributes<HTMLDivElement> & {
  swapRoute: SwapRoute;
  isExactOut: boolean;
  amountInMax: bigint;
  amountOutMin: bigint;
};

export const SwapRoutePanel = ({
  swapRoute: {
    tokenIn,
    tokenOut,
    amountIn,
    amountOut,
    priceImpact,
    derivedValue,
    lpFee,
    protocolFee,
    royaltiesFee,
  },
  isExactOut,
  amountInMax,
  amountOutMin,
  className,
}: Props) => {
  const isNFTNFT = tokenIn.isNFT && !!tokenOut?.isNFT;
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border border-night-800 text-night-400 text-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between border border-night-1000 border-b p-4">
        <span>
          <span className="font-medium text-honey-25">1</span>{" "}
          {tokenOut?.symbol} ={" "}
          <span className="font-medium text-honey-25">
            {formatAmount(derivedValue)}
          </span>{" "}
          {tokenIn.symbol}
        </span>
      </div>
      {amountIn > 0 && amountOut > 0 ? (
        <ul className="mt-2.5 space-y-1 p-4 pt-0">
          <li className="flex items-center justify-between">
            Price impact
            <span>{formatPercent(priceImpact * -1)}</span>
          </li>
          {lpFee > 0 && (
            <li className="flex items-center justify-between">
              Liquidity provider fee
              <span>{formatPercent(lpFee, 3)}</span>
            </li>
          )}
          {royaltiesFee > 0 && (
            <li className="flex items-center justify-between">
              Royalties fee
              <span>{formatPercent(royaltiesFee, 3)}</span>
            </li>
          )}
          {protocolFee > 0 && (
            <li className="flex items-center justify-between">
              Protocol fee
              <span>{formatPercent(protocolFee, 3)}</span>
            </li>
          )}
          {isNFTNFT ? (
            <li className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                NFT dust sent to pool
                <InfoPopover buttonClassName="h-3 w-3">
                  NFTs can only be traded in whole amounts so any fractional
                  amounts are sent to the pool to reward liquidity providers.
                  Minimize this amount to get the best trade value by adjusting
                  the {isExactOut ? "output" : "input"} amount selected.
                </InfoPopover>
              </span>
              <span>
                {formatAmount(
                  isExactOut
                    ? ceilBigInt(amountIn) - amountIn
                    : amountOut - floorBigInt(amountOut),
                  {
                    decimals: isExactOut ? tokenIn.decimals : tokenOut.decimals,
                  },
                )}{" "}
                {isExactOut ? tokenIn.symbol : tokenOut.symbol}
              </span>
            </li>
          ) : isExactOut ? (
            <li className="flex items-center justify-between">
              Maximum spent
              <span>
                {formatAmount(amountInMax, { decimals: tokenIn.decimals })}{" "}
                {tokenIn.symbol}
              </span>
            </li>
          ) : (
            <li className="flex items-center justify-between">
              Minimum received
              <span>
                {formatAmount(amountOutMin, { decimals: tokenOut?.decimals })}{" "}
                {tokenOut?.symbol}
              </span>
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
};

// const getPriceImpactClassName = (priceImpact: number) =>
//   priceImpact >= 0.05
//     ? "text-red-500"
//     : priceImpact > 0.01
//       ? "text-amber-500"
//       : "text-honey-25";
