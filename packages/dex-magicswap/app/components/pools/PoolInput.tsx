import { formatEther } from "viem";

import { useAccount } from "~/contexts/account";
import { formatAmount, formatUSD } from "~/lib/currency";
import { bigIntToNumber, formatPercent } from "~/lib/number";
import type { Pool } from "~/lib/pools.server";
import { CurrencyInput } from "../CurrencyInput";
import { PoolImage } from "./PoolImage";

export const PoolInput = ({
  pool,
  balance,
  amount,
  onUpdateAmount,
}: {
  pool: Pool;
  balance: bigint;
  amount: string;
  onUpdateAmount: (amount: string) => void;
}) => {
  const { isConnected } = useAccount();
  const parsedAmount = Number(amount);
  return (
    <div className="relative overflow-hidden rounded-lg bg-night-1100">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center">
          <PoolImage pool={pool} />
          <p className="-ml-2 font-medium text-sm sm:text-xl">{pool.name}</p>
        </div>
        <div className="space-y-1 text-right">
          <CurrencyInput
            value={amount}
            onChange={onUpdateAmount}
            disabled={!isConnected}
          />
          {pool.reserveUSD ? (
            <span className="block text-night-400 text-sm">
              {formatUSD(
                (pool.reserveUSD / bigIntToNumber(BigInt(pool.totalSupply))) *
                  (Number.isNaN(parsedAmount) || parsedAmount === 0
                    ? 1
                    : Number(amount.replace(/,/g, ""))),
              )}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex h-12 items-center justify-end bg-night-900 p-2">
        {[0.25, 0.5, 0.75, 1].map((percent) => (
          <button
            key={percent}
            type="button"
            className="rounded-lg px-3 py-1.5 text-night-400 text-sm transition-colors hover:bg-night-800 hover:text-night-100"
            onClick={() =>
              onUpdateAmount(
                percent === 1
                  ? formatEther(balance)
                  : formatAmount(bigIntToNumber(balance) * percent, {
                      type: "raw",
                    }),
              )
            }
          >
            {formatPercent(percent)}
          </button>
        ))}
      </div>
    </div>
  );
};
