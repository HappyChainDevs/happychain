import { formatAmount, formatUSD } from "~/lib/currency";
import type { PoolToken } from "~/types";
import { CurrencyInput } from "../CurrencyInput";
import { VisibleOnClient } from "../VisibleOnClient";
import { InfoPopover } from "../ui/InfoPopover";
import { PoolTokenImage } from "./PoolTokenImage";

export const PoolTokenInput = ({
  token,
  balance = 0n,
  amount,
  disabled = false,
  onUpdateAmount,
}: {
  token: PoolToken;
  balance?: bigint;
  amount: string;
  disabled?: boolean;
  onUpdateAmount: (amount: string) => void;
}) => {
  const parsedAmount = Number(amount);
  return (
    <div className="overflow-hidden rounded-lg bg-night-1100">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-4">
          <PoolTokenImage className="h-10 w-10" token={token} />
          <div className="flex-1">
            <p className="font-medium text-sm sm:text-xl">{token.symbol}</p>
            {token.name.toUpperCase() !== token.symbol.toUpperCase() ? (
              <p className="text-night-400 text-xs sm:text-sm">{token.name}</p>
            ) : null}
          </div>
        </div>
        <div className="space-y-1 text-right">
          <CurrencyInput
            value={amount}
            disabled={disabled}
            onChange={onUpdateAmount}
          />
          {token.priceUSD ? (
            <span className="block text-[0.6rem] text-night-400 sm:text-sm">
              {formatUSD(
                token.priceUSD *
                  (Number.isNaN(parsedAmount) || parsedAmount === 0
                    ? 1
                    : Number(amount.replace(/,/g, ""))),
              )}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex items-center justify-between bg-night-900 p-3">
        <p className="flex items-center text-night-400 text-sm">
          Balance:
          <span className="inline-block pl-1 font-medium text-night-100">
            <VisibleOnClient>
              {formatAmount(balance, { decimals: token.decimals })}
            </VisibleOnClient>
          </span>
        </p>
        {disabled ? (
          <InfoPopover>
            Input is disabled because the amount will be auto-calculated based
            on the selected NFTs.
          </InfoPopover>
        ) : null}
      </div>
    </div>
  );
};
