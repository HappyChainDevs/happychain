import { HelpCircle } from "lucide-react";
import { useCallback, useState } from "react";
import { Balancer } from "react-wrap-balancer";
import { formatEther, formatUnits, parseUnits } from "viem";

import { useAccount } from "~/contexts/account";
import { useAddLiquidity } from "~/hooks/useAddLiquidity";
import { useApproval } from "~/hooks/useApproval";
import { useRouterAddress } from "~/hooks/useContractAddress";
import { useTokenBalance } from "~/hooks/useTokenBalance";
import { formatAmount } from "~/lib/currency";
import { bigIntToNumber, formatPercent } from "~/lib/number";
import { getAmountMin, getLpCountForTokens, quote } from "~/lib/pools";
import type { Pool } from "~/lib/pools.server";
import { countTokens } from "~/lib/tokens";
import { DEFAULT_SLIPPAGE, useSettingsStore } from "~/store/settings";
import type {
  AddressString,
  NumberString,
  Optional,
  PoolToken,
  TroveTokenWithQuantity,
} from "~/types";
import { SelectionPopup } from "../SelectionPopup";
import { Table } from "../Table";
import { TransactionButton } from "../ui/Button";
import { LabeledCheckbox } from "../ui/Checkbox";
import { Dialog } from "../ui/Dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/Popover";
import { PoolImage } from "./PoolImage";
import { PoolNftTokenInput } from "./PoolNftTokenInput";
import { PoolTokenImage } from "./PoolTokenImage";
import { PoolTokenInput } from "./PoolTokenInput";

type Props = {
  pool: Pool;
  nftBalances: {
    nftBalance0: Promise<number> | undefined;
    nftBalance1: Promise<number> | undefined;
  };
  onSuccess?: () => void;
};

export const PoolDepositTab = ({
  pool,
  nftBalances: { nftBalance0, nftBalance1 },
  onSuccess,
}: Props) => {
  const { address } = useAccount();
  const slippage = useSettingsStore((state) => state.slippage);

  const [{ amount: rawAmount, nfts0, nfts1, isExact1 }, setTransaction] =
    useState({
      amount: "0",
      nfts0: [] as TroveTokenWithQuantity[],
      nfts1: [] as TroveTokenWithQuantity[],
      isExact1: false,
    });
  const [selectingToken, setSelectingToken] = useState<Optional<PoolToken>>();
  const [checkedTerms, setCheckedTerms] = useState(false);
  const routerAddress = useRouterAddress(pool.version);
  const isSelectingToken1 = selectingToken?.id === pool.token1.id;

  const amount = parseUnits(
    rawAmount as NumberString,
    isExact1 ? pool.token1.decimals : pool.token0.decimals,
  );
  const amount0 = isExact1
    ? quote(amount, BigInt(pool.token1.reserve), BigInt(pool.token0.reserve))
    : amount;
  const amount1 = isExact1
    ? amount
    : quote(amount, BigInt(pool.token0.reserve), BigInt(pool.token1.reserve));
  const hasAmount = amount > 0;

  const requiredNfts0 =
    isExact1 && hasAmount
      ? Math.ceil(bigIntToNumber(amount0, pool.token0.decimals))
      : undefined;
  const requiredNfts1 =
    !isExact1 && hasAmount
      ? Math.ceil(bigIntToNumber(amount1, pool.token1.decimals))
      : undefined;

  // Fetch balance of token0 if it's an ERC20
  const { data: balance0, refetch: refetchBalance0 } = useTokenBalance({
    id: pool.token0.id as AddressString,
    address,
    isETH: pool.token0.isETH,
    enabled: !pool.token0.isNFT,
  });

  // Fetch balance of token1 if it's an ERC20
  const { data: balance1, refetch: refetchBalance1 } = useTokenBalance({
    id: pool.token1.id as AddressString,
    address,
    isETH: pool.token1.isETH,
    enabled: !pool.token1.isNFT,
  });

  // Check for approval of token0
  const {
    isApproved: isApproved0,
    allowance: allowance0,
    approve: approve0,
  } = useApproval({
    operator: routerAddress,
    token: pool.token0,
    amount: amount0,
    enabled: hasAmount,
  });

  // Check for approval of token1
  const {
    isApproved: isApproved1,
    allowance: allowance1,
    approve: approve1,
  } = useApproval({
    operator: routerAddress,
    token: pool.token1,
    amount: amount1,
    enabled: hasAmount,
  });

  const { addLiquidity } = useAddLiquidity({
    pool,
    amount0,
    amount1,
    amount0Min: isExact1
      ? getAmountMin(amount0, slippage || DEFAULT_SLIPPAGE)
      : amount0,
    amount1Min: isExact1
      ? amount1
      : getAmountMin(amount1, slippage || DEFAULT_SLIPPAGE),
    nfts0,
    nfts1,
    isExact1,
    enabled: isApproved0 && isApproved1 && hasAmount,
    onSuccess: useCallback(() => {
      setTransaction({
        amount: "0",
        nfts0: [],
        nfts1: [],
        isExact1: false,
      });
      refetchBalance0();
      refetchBalance1();
      setCheckedTerms(false);
      onSuccess?.();
    }, [onSuccess, refetchBalance0, refetchBalance1]),
  });

  const estimatedLp = getLpCountForTokens(
    amount0,
    BigInt(pool.token0.reserve),
    BigInt(pool.totalSupply),
  );

  const insufficientBalanceA = !pool.token0.isNFT
    ? Number.parseFloat(
        isExact1 ? formatUnits(amount0, pool.token0.decimals) : rawAmount,
      ) > Number.parseFloat(formatEther(balance0 ?? 0n))
    : false;

  const insufficientBalanceB = !pool.token1.isNFT
    ? Number.parseFloat(
        !isExact1 ? formatUnits(amount1, pool.token1.decimals) : rawAmount,
      ) > Number.parseFloat(formatEther(balance1 ?? 0n))
    : false;

  return (
    <div className="space-y-6">
      <Dialog
        open={!!selectingToken}
        onOpenChange={(open) => {
          if (!open) {
            setSelectingToken(undefined);
          }
        }}
      >
        {selectingToken ? (
          <SelectionPopup
            type="inventory"
            token={selectingToken}
            selectedTokens={isSelectingToken1 ? nfts1 : nfts0}
            requiredAmount={isSelectingToken1 ? requiredNfts1 : requiredNfts0}
            onSubmit={(tokens) => {
              const amountTokens = countTokens(tokens);
              setTransaction((curr) => {
                const amountNFTs0 = countTokens(curr.nfts0);
                const amountNFTs1 = countTokens(curr.nfts1);
                // Determine if we should treat this seleciton as a new transaction
                if (
                  (amountNFTs0 === 0 && amountNFTs1 === 0) || // user hasn't selecting anything previously
                  (isSelectingToken1 &&
                    amountNFTs1 > 0 &&
                    amountNFTs1 !== amountTokens) || // user previously selected NFTs B, but changed the amount
                  (!isSelectingToken1 &&
                    amountNFTs0 > 0 &&
                    amountNFTs0 !== amountTokens) // user previously selected NFTs A, but changed the amount
                ) {
                  return {
                    amount: amountTokens.toString(),
                    nfts0: isSelectingToken1 ? [] : tokens,
                    nfts1: isSelectingToken1 ? tokens : [],
                    isExact1: isSelectingToken1,
                  };
                }

                // Not a new transaction, treat this simply as an NFT selection
                const next = { ...curr };
                if (isSelectingToken1) {
                  next.nfts1 = tokens;
                } else {
                  next.nfts0 = tokens;
                }

                return next;
              });
            }}
          >
            {({ amount: selectingAmount }) => {
              if (
                (isSelectingToken1 && requiredNfts1 !== undefined) ||
                (!isSelectingToken1 && requiredNfts0 !== undefined)
              ) {
                return null;
              }

              const amount = parseUnits(
                selectingAmount as NumberString,
                isSelectingToken1 ? pool.token1.decimals : pool.token0.decimals,
              );
              const amount0 = isSelectingToken1
                ? quote(
                    amount,
                    BigInt(pool.token1.reserve),
                    BigInt(pool.token0.reserve),
                  )
                : amount;
              const amount1 = isSelectingToken1
                ? amount
                : quote(
                    amount,
                    BigInt(pool.token0.reserve),
                    BigInt(pool.token1.reserve),
                  );
              const otherAmount = isSelectingToken1 ? amount0 : amount1;
              const otherToken = isSelectingToken1 ? pool.token0 : pool.token1;
              return (
                <div className="flex items-center gap-2 rounded-lg bg-night-800 p-4">
                  <span className="text-night-400 text-sm">Requires:</span>
                  <span className="flex items-center gap-1">
                    <PoolTokenImage
                      token={otherToken}
                      className="h-4 w-4 flex-shrink-0"
                    />
                    <span className="truncate font-medium text-honey-25 text-sm">
                      {formatAmount(otherAmount, {
                        decimals: otherToken.decimals,
                      })}
                    </span>
                  </span>
                </div>
              );
            }}
          </SelectionPopup>
        ) : null}
        {pool.token0.isNFT ? (
          <PoolNftTokenInput
            token={pool.token0}
            amount={requiredNfts0}
            balance={nftBalance0}
            selectedNfts={nfts0}
            onOpenSelect={setSelectingToken}
          />
        ) : (
          <PoolTokenInput
            token={pool.token0}
            balance={balance0}
            amount={
              isExact1
                ? formatAmount(amount0, { decimals: pool.token0.decimals })
                : rawAmount
            }
            disabled={pool.token1.isNFT}
            onUpdateAmount={(amount) =>
              setTransaction({
                amount,
                nfts0: [],
                nfts1: [],
                isExact1: false,
              })
            }
          />
        )}
        {pool.token1.isNFT ? (
          <PoolNftTokenInput
            token={pool.token1}
            amount={requiredNfts1}
            balance={nftBalance1}
            selectedNfts={nfts1}
            onOpenSelect={setSelectingToken}
          />
        ) : (
          <PoolTokenInput
            token={pool.token1}
            balance={balance1}
            amount={
              isExact1
                ? rawAmount
                : formatAmount(amount1, { decimals: pool.token1.decimals })
            }
            disabled={pool.token0.isNFT}
            onUpdateAmount={(amount) =>
              setTransaction({
                amount,
                nfts0: [],
                nfts1: [],
                isExact1: true,
              })
            }
          />
        )}
      </Dialog>
      <Table
        items={[
          {
            label: "Estimated MLP tokens",
            value: (
              <div className="-space-x-1 flex items-center">
                <PoolImage className="h-5 w-5" pool={pool} />
                <span>{formatAmount(estimatedLp)}</span>
              </div>
            ),
          },
          {
            label: "Share of pool",
            value: formatPercent(
              BigInt(pool.totalSupply) > 0
                ? bigIntToNumber(estimatedLp) /
                    (bigIntToNumber(BigInt(pool.totalSupply)) +
                      bigIntToNumber(estimatedLp))
                : 0,
            ),
          },
        ]}
      />
      {pool.hasNFT && (
        <LabeledCheckbox
          onCheckedChange={(checked) => setCheckedTerms(Boolean(checked))}
          checked={checkedTerms}
          className="rounded-md border border-night-800 bg-night-1100/50 p-4"
          id="terms"
          description="I hereby acknowledge and accept the potential uncertainty regarding the retrievability of the specific asset deposited. Should the original asset become unavailable, I willingly consent to receive an alternative asset from the existing collection."
        >
          Accept terms and conditions
        </LabeledCheckbox>
      )}
      <div className="space-y-1.5">
        <TransactionButton
          className="w-full"
          size="lg"
          disabled={
            !hasAmount ||
            insufficientBalanceA ||
            insufficientBalanceB ||
            (pool.hasNFT && !checkedTerms)
          }
          onClick={() => {
            if (!isApproved0) {
              return approve0?.();
            }

            if (!isApproved1) {
              return approve1?.();
            }

            return addLiquidity?.();
          }}
        >
          {!hasAmount ? (
            "Enter amount"
          ) : insufficientBalanceA || insufficientBalanceB ? (
            "Insufficient balance"
          ) : !isApproved0 ? (
            <div className="flex items-center">
              <span>Approve {pool.token0.name}</span>
              {allowance0 > 0n ? <ApproveAgainInfoPopover /> : null}
            </div>
          ) : !isApproved1 ? (
            <div className="flex items-center">
              <span>Approve {pool.token1.name}</span>
              {allowance1 > 0n ? <ApproveAgainInfoPopover /> : null}
            </div>
          ) : (
            "Add liquidity"
          )}
        </TransactionButton>
      </div>
    </div>
  );
};

const ApproveAgainInfoPopover = () => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        className="group ml-1"
        onClick={(e) => e.stopPropagation()}
      >
        <HelpCircle className="h-4 w-4 transition-colors group-hover:text-night-100" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="center" className="w-72 text-left">
      <p className="text-night-300 text-xs">
        <Balancer>
          You will need to approve again because the amount you entered exceeds
          the amount you previously approved.
        </Balancer>
      </p>
    </PopoverContent>
  </Popover>
);
