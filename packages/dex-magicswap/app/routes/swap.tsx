import { DialogClose } from "@radix-ui/react-dialog";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { defer } from "@remix-run/node";
import type { MetaFunction } from "@remix-run/react";
import {
  Await,
  Link,
  useLoaderData,
  useLocation,
  useRevalidator,
  useSearchParams,
} from "@remix-run/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  GlobeIcon as AllIcon,
  ArrowDownIcon,
  ChevronDownIcon,
  ExternalLink,
  LayersIcon,
  SearchIcon,
} from "lucide-react";
import { Suspense, useCallback, useEffect, useState } from "react";
import useMeasure from "react-use-measure";
import { ClientOnly } from "remix-utils/client-only";
import { formatUnits } from "viem";
import { useChainId } from "wagmi";

import { fetchPools } from "~/api/pools.server";
import {
  fetchPoolTokenBalance,
  fetchToken,
  fetchTokensWithMetadata,
} from "~/api/tokens.server";
import { CurrencyInput } from "~/components/CurrencyInput";
import { LoaderIcon, SwapIcon, TokenIcon } from "~/components/Icons";
import { SelectionPopup } from "~/components/SelectionPopup";
import { SettingsDropdownMenu } from "~/components/SettingsDropdownMenu";
import { VisibleOnClient } from "~/components/VisibleOnClient";
import { PoolTokenImage } from "~/components/pools/PoolTokenImage";
import { SwapRoutePanel } from "~/components/swap/SwapRoutePanel";
import { Button, TransactionButton } from "~/components/ui/Button";
import { LabeledCheckbox } from "~/components/ui/Checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/Dialog";
import { InfoPopover } from "~/components/ui/InfoPopover";
import { Input } from "~/components/ui/Input";
import { GAME_METADATA } from "~/consts";
import { useAccount } from "~/contexts/account";
import { useApproval } from "~/hooks/useApproval";
import { useRouterAddress } from "~/hooks/useContractAddress";
import { useFocusInterval } from "~/hooks/useFocusInterval";
import { usePoolTokenBalance } from "~/hooks/usePoolTokenBalance";
import { useSwap } from "~/hooks/useSwap";
import { useSwapRoute } from "~/hooks/useSwapRoute";
import { useTokenBalance } from "~/hooks/useTokenBalance";
import { useTrove } from "~/hooks/useTrove";
import { formatAmount, formatUSD } from "~/lib/currency";
import { ENV } from "~/lib/env.server";
import { getCollectionIdsMapForGame, getTokenIdsMapForGame } from "~/lib/game";
import { bigIntToNumber, floorBigInt, formatNumber } from "~/lib/number";
import { generateTitle, generateUrl, getSocialMetas } from "~/lib/seo";
import { countTokens } from "~/lib/tokens";
import { cn } from "~/lib/utils";
import type { RootLoader } from "~/root";
import { getSession } from "~/sessions";
import type {
  AddressString,
  Optional,
  PoolToken,
  TroveTokenWithQuantity,
} from "~/types";

export const meta: MetaFunction<
  typeof loader,
  {
    root: RootLoader;
  }
> = ({ matches, data, location }) => {
  const requestInfo = matches.find((match) => match.id === "root")?.data
    .requestInfo;
  const url = generateUrl(requestInfo?.origin, location.pathname);
  return getSocialMetas({
    url,
    title: generateTitle(
      data?.tokenOut
        ? `Swap ${data?.tokenIn.symbol} to ${data?.tokenOut.symbol}`
        : "Swap",
    ),
    image: data?.tokenOut
      ? `${url}/${data?.tokenIn.id}/${data?.tokenOut.id}.png`
      : generateUrl(requestInfo?.origin, "/img/seo-banner.png"),
  });
};

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const tokenInAddress =
    url.searchParams.get("in") ?? ENV.PUBLIC_DEFAULT_TOKEN_ADDRESS;
  const tokenOutAddress = url.searchParams.get("out");

  const [session, pools, tokenIn, tokenOut] = await Promise.all([
    getSession(request.headers.get("Cookie")),
    fetchPools(),
    tokenInAddress ? fetchToken(tokenInAddress) : null,
    tokenOutAddress ? fetchToken(tokenOutAddress) : null,
  ]);

  if (!tokenIn) {
    throw new Response("Input token not found", {
      status: 404,
    });
  }

  const address = session.get("address");
  return defer({
    pools,
    tokens: fetchTokensWithMetadata(),
    tokenIn,
    tokenOut,
    tokenInNFTBalance:
      address && tokenIn.isNFT
        ? fetchPoolTokenBalance(tokenIn, address)
        : undefined,
    address,
  });
}

const DEFAULT_STATE = {
  amount: "0",
  nftsIn: [] as TroveTokenWithQuantity[],
  nftsOut: [] as TroveTokenWithQuantity[],
  isExactOut: false,
};

export default function SwapPage() {
  const loaderData = useLoaderData<typeof loader>();
  const revalidator = useRevalidator();
  const { address, isConnected } = useAccount();
  const [searchParams, setSearchParams] = useSearchParams();
  const [{ amount, isExactOut, nftsIn, nftsOut }, setTrade] =
    useState(DEFAULT_STATE);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [priceImpactOptIn, setPriceImpactOptIn] = useState(false);
  const location = useLocation();

  const handleSelectToken = (direction: "in" | "out", token: PoolToken) => {
    searchParams.set(direction, token.id);
    // adding state (can be anything here) on client side transition to indicate that a modal can pop-up
    setSearchParams(searchParams, {
      state: "true",
    });
  };

  const swapRoute = useSwapRoute({
    ...loaderData,
    amount,
    isExactOut,
  });

  const amountNFTsIn = countTokens(nftsIn);
  const amountNFTsOut = countTokens(nftsOut);

  const {
    isValid: isValidSwapRoute,
    version = "V2",
    amountIn,
    amountOut,
    tokenIn,
    tokenOut,
    path,
    priceImpact,
  } = swapRoute;

  const routerAddress = useRouterAddress(version);

  const requiredNftsIn = Math.ceil(bigIntToNumber(amountIn, tokenIn.decimals));
  const requiredNftsOut = Math.floor(
    bigIntToNumber(amountOut, tokenOut?.decimals),
  );

  const hasAmounts =
    amountIn > 0 &&
    amountOut > 0 &&
    (!tokenIn.isNFT || requiredNftsIn === amountNFTsIn) &&
    (!tokenOut?.isNFT || requiredNftsOut === amountNFTsOut);
  const requiresPriceImpactOptIn = hasAmounts && priceImpact >= 0.15;

  const { data: tokenInBalance, refetch: refetchTokenInBalance } =
    useTokenBalance({
      id: tokenIn.id as AddressString,
      address,
      isETH: tokenIn.isETH,
      enabled: !tokenIn.isNFT,
    });

  const { data: tokenOutBalance, refetch: refetchTokenOutBalance } =
    useTokenBalance({
      id: tokenOut?.id as AddressString,
      address,
      isETH: tokenOut?.isETH,
      enabled: !tokenOut?.isNFT,
    });

  const refetch = useCallback(() => {
    if (revalidator.state === "idle") {
      // revalidator.revalidate();
    }

    refetchTokenInBalance();
    refetchTokenOutBalance();
  }, [revalidator, refetchTokenInBalance, refetchTokenOutBalance]);

  useFocusInterval(refetch, 5_000);

  const { amountInMax, amountOutMin, swap } = useSwap({
    version,
    tokenIn,
    tokenOut,
    amountIn,
    amountOut,
    isExactOut,
    nftsIn,
    nftsOut,
    path,
    enabled: isConnected && !!tokenOut && hasAmounts && isValidSwapRoute,
    onSuccess: () => {
      setTrade(DEFAULT_STATE);
      refetch();
      setSwapModalOpen(false);
      setPriceImpactOptIn(false);
    },
  });

  const { isApproved: isTokenInApproved, approve: approveTokenIn } =
    useApproval({
      operator: routerAddress,
      token: tokenIn,
      amount: amountInMax,
      enabled: isConnected && hasAmounts,
    });

  // biome-ignore lint/correctness/useExhaustiveDependencies: tokenIn is not memoized
  useEffect(() => {
    if (tokenIn.isNFT) {
      setTrade(DEFAULT_STATE);
    } else {
      setTrade((trade) => ({
        ...trade,
        nftsOut: [],
      }));
    }
  }, [tokenIn.id]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: tokenOut is not memoized
  useEffect(() => {
    if (tokenOut?.isNFT) {
      setTrade(DEFAULT_STATE);
    } else {
      setTrade((trade) => ({
        ...trade,
        nftsOut: [],
      }));
    }
  }, [tokenOut?.id]);

  const formattedTokenInAmount = formatAmount(amountIn, {
    decimals: tokenIn.decimals,
  });
  const formattedTokenOutAmount = formatAmount(amountOut, {
    decimals: tokenOut?.decimals,
  });

  return (
    <main className="mx-auto max-w-xl px-4 pt-12 pb-20 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between gap-3 text-night-600">
        <div className="flex items-center gap-1.5 font-bold text-xl">
          <SwapIcon className="h-6 w-6" />
          <h1 className="text-night-100">Swap</h1>
        </div>
        <SettingsDropdownMenu />
      </div>
      <div className="mt-3">
        <SwapTokenInput
          key={`${location.search}-in`}
          token={tokenIn}
          otherToken={tokenOut}
          isOut={false}
          balance={tokenInBalance}
          amount={
            isExactOut
              ? tokenIn.isNFT
                ? requiredNftsIn.toString()
                : formattedTokenInAmount
              : amount
          }
          selectedNfts={nftsIn}
          requiredNftSelectionAmount={
            isExactOut && amountNFTsOut > 0 ? requiredNftsIn : undefined
          }
          onSelect={(token) => handleSelectToken("in", token)}
          onUpdateAmount={(amount) =>
            setTrade({
              amount,
              nftsIn: [],
              nftsOut: [],
              isExactOut: false,
            })
          }
          onSelectNfts={(tokens) => {
            const amountTokens = countTokens(tokens);
            setTrade((curr) => {
              // Determine if we should treat this seleciton as a new transaction
              if (
                (amountNFTsIn === 0 && amountNFTsOut === 0) || // user hasn't selecting anything previously
                (amountNFTsIn > 0 && amountNFTsIn !== amountTokens) // user previously selected NFTs in, but changed the amount
              ) {
                return {
                  amount: amountTokens.toString(),
                  nftsIn: tokens,
                  nftsOut: [],
                  isExactOut: false,
                };
              }

              // Not a new transaction, treat this simply as an NFT selection
              return {
                ...curr,
                nftsIn: tokens,
              };
            });
          }}
        />
        <Link
          to={`/swap?in=${tokenOut?.id}&out=${tokenIn.id}`}
          aria-disabled={!tokenOut?.id ? "true" : "false"}
          onClick={(e) => !tokenOut?.id && e.preventDefault()}
          className={cn(
            "-my-2 relative z-10 mx-auto flex h-8 w-8 items-center justify-center rounded border-4 border-night-1200 bg-night-1100 text-honey-25",
            !tokenOut?.id ? "cursor-not-allowed text-night-800" : "group",
          )}
        >
          <ArrowDownIcon className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
        </Link>
        <SwapTokenInput
          key={`${location.search}-out`}
          token={tokenOut}
          otherToken={tokenIn}
          isOut
          balance={tokenOutBalance}
          amount={
            isExactOut
              ? amount
              : tokenOut?.isNFT
                ? requiredNftsOut.toString()
                : formattedTokenOutAmount
          }
          selectedNfts={nftsOut}
          requiredNftSelectionAmount={
            !isExactOut && amountNFTsIn > 0 ? requiredNftsOut : undefined
          }
          onSelect={(token) => handleSelectToken("out", token)}
          onUpdateAmount={(amount) =>
            setTrade({
              amount,
              nftsIn: [],
              nftsOut: [],
              isExactOut: true,
            })
          }
          onSelectNfts={(tokens) => {
            const amountTokens = countTokens(tokens);
            setTrade((curr) => {
              // Determine if we should treat this seleciton as a new transaction
              if (
                (amountNFTsIn === 0 && amountNFTsOut === 0) || // user hasn't selecting anything previously
                (amountNFTsOut > 0 && amountNFTsOut !== amountTokens) // user previously selected NFTs out, but changed the amount
              ) {
                return {
                  amount: amountTokens.toString(),
                  nftsIn: [],
                  nftsOut: tokens,
                  isExactOut: true,
                };
              }

              // Not a new transaction, treat this simply as an NFT selection
              return {
                ...curr,
                nftsOut: tokens,
              };
            });
          }}
        />
        <div className="mt-4 space-y-4">
          <ClientOnly>
            {() => (
              <>
                {requiresPriceImpactOptIn ? (
                  <LabeledCheckbox
                    className="rounded-lg border border-red-500 bg-red-500/20 p-3 text-honey-25/90"
                    onCheckedChange={(checked) =>
                      setPriceImpactOptIn(Boolean(checked))
                    }
                    checked={priceImpactOptIn}
                    id="priceImpactOptIn"
                    description="You will lose a big portion of your funds in this trade. Please tick the box if you would like to continue."
                    checkboxClassName="border-red-900"
                  >
                    Price impact is too high
                  </LabeledCheckbox>
                ) : null}
                {!!tokenOut && !isValidSwapRoute ? (
                  <Button className="w-full" size="lg" disabled>
                    Swap route not available
                  </Button>
                ) : !isTokenInApproved &&
                  hasAmounts &&
                  (!requiresPriceImpactOptIn || priceImpactOptIn) ? (
                  <TransactionButton
                    className="w-full"
                    size="lg"
                    onClick={() => approveTokenIn()}
                  >
                    Approve {tokenIn.name}
                  </TransactionButton>
                ) : (
                  <Dialog open={swapModalOpen} onOpenChange={setSwapModalOpen}>
                    <DialogTrigger asChild>
                      <TransactionButton
                        className="w-full"
                        size="lg"
                        disabled={
                          !hasAmounts ||
                          (requiresPriceImpactOptIn && !priceImpactOptIn)
                        }
                      >
                        Swap Items
                      </TransactionButton>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        Swap {formattedTokenInAmount} {tokenIn.symbol} for{" "}
                        {formattedTokenOutAmount} {tokenOut?.symbol}
                      </DialogHeader>
                      <div>
                        <div className="overflow-hidden rounded-lg bg-night-1100">
                          <div className="flex items-center bg-night-900 px-3.5 py-2.5">
                            <PoolTokenImage
                              token={tokenIn}
                              className="h-6 w-6"
                            />
                            <span className="ml-2 font-medium text-honey-25">
                              {tokenIn.name}
                            </span>
                          </div>
                          <div className="p-4">
                            {tokenIn.isNFT ? (
                              nftsIn.length > 0 ? (
                                <div className="flex items-center space-x-2">
                                  <div
                                    className={cn("flex", {
                                      "-space-x-5": tokenIn.type === "ERC721",
                                    })}
                                  >
                                    {nftsIn
                                      .slice(0, Math.min(nftsIn.length, 5))
                                      .map((nft) => {
                                        return (
                                          <div
                                            key={nft.tokenId}
                                            className="flex flex-col items-center"
                                          >
                                            <img
                                              className="h-12 w-12 rounded border-2 border-night-1100"
                                              src={nft.image.uri}
                                              alt={nft.metadata.name}
                                            />
                                            {tokenIn.type === "ERC1155" ? (
                                              <p className="text-night-600 text-xs">
                                                {nft.quantity}x
                                              </p>
                                            ) : null}
                                          </div>
                                        );
                                      })}
                                  </div>
                                  {nftsIn.length > 5 ? (
                                    <div className="flex items-center rounded-md bg-night-900 px-2 py-1.5">
                                      <p className="font-semibold text-night-500 text-xs">
                                        +{nftsIn.length - 5}
                                      </p>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null
                            ) : (
                              <p>{formattedTokenInAmount}</p>
                            )}
                          </div>
                        </div>
                        <div className="-my-2 relative z-10 mx-auto flex h-8 w-8 items-center justify-center rounded border-4 border-night-1200 bg-night-1100 text-honey-25">
                          <ArrowDownIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="overflow-hidden rounded-lg bg-night-1100">
                          <div className="flex items-center bg-night-900 px-3.5 py-2.5">
                            <PoolTokenImage
                              token={tokenOut}
                              className="h-6 w-6"
                            />
                            <span className="ml-2 font-medium text-honey-25">
                              {tokenOut?.name}
                            </span>
                          </div>
                          <div className="p-4">
                            {tokenOut?.isNFT ? (
                              nftsOut.length > 0 ? (
                                <div className="flex items-center space-x-2">
                                  <div
                                    className={cn("flex", {
                                      "-space-x-5": tokenOut?.type === "ERC721",
                                    })}
                                  >
                                    {nftsOut
                                      .slice(0, Math.min(nftsOut.length, 5))
                                      .map((nft) => {
                                        return (
                                          <div
                                            key={nft.tokenId}
                                            className="flex flex-col items-center"
                                          >
                                            <img
                                              className="h-12 w-12 rounded border-2 border-night-1100"
                                              src={nft.image.uri}
                                              alt={nft.metadata.name}
                                            />
                                            {tokenOut?.type === "ERC1155" ? (
                                              <p className="text-night-600 text-xs">
                                                {nft.quantity}x
                                              </p>
                                            ) : null}
                                          </div>
                                        );
                                      })}
                                  </div>
                                  {nftsOut.length > 5 ? (
                                    <div className="flex items-center rounded-md bg-night-900 px-2 py-1.5">
                                      <p className="font-semibold text-night-500 text-xs">
                                        +{nftsOut.length - 5}
                                      </p>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null
                            ) : (
                              <p>{formattedTokenOutAmount}</p>
                            )}
                          </div>
                        </div>
                        <SwapRoutePanel
                          className="mt-4"
                          swapRoute={swapRoute}
                          isExactOut={isExactOut}
                          amountInMax={
                            tokenIn.isNFT ? floorBigInt(amountIn) : amountInMax
                          }
                          amountOutMin={
                            tokenOut?.isNFT
                              ? floorBigInt(amountOut)
                              : amountOutMin
                          }
                        />
                        <div className="mt-4 grid grid-cols-3 gap-3">
                          <Button
                            size="lg"
                            className="col-span-full sm:col-span-2"
                            onClick={() => swap()}
                          >
                            Confirm Swap
                          </Button>
                          <DialogClose asChild>
                            <Button
                              size="lg"
                              variant="secondary"
                              className="col-span-full sm:col-span-1"
                            >
                              Cancel
                            </Button>
                          </DialogClose>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </>
            )}
          </ClientOnly>
        </div>
        {!!tokenOut && isValidSwapRoute ? (
          <SwapRoutePanel
            className="mt-4"
            swapRoute={swapRoute}
            isExactOut={isExactOut}
            amountInMax={amountInMax}
            amountOutMin={amountOutMin}
          />
        ) : null}
      </div>
    </main>
  );
}

const SwapTokenInput = ({
  token,
  otherToken,
  isOut,
  balance = 0n,
  amount,
  selectedNfts,
  requiredNftSelectionAmount,
  onSelect,
  onUpdateAmount,
  onSelectNfts,
  className,
}: {
  token: Optional<PoolToken>;
  otherToken: Optional<PoolToken>;
  isOut: boolean;
  balance?: bigint;
  amount: string;
  selectedNfts: TroveTokenWithQuantity[];
  requiredNftSelectionAmount?: number;
  onSelect: (token: PoolToken) => void;
  onUpdateAmount: (amount: string) => void;
  onSelectNfts: (tokens: TroveTokenWithQuantity[]) => void;
  className?: string;
}) => {
  const parsedAmount = Number(amount);
  const amountPriceUSD =
    (token?.priceUSD ?? 0) *
    (Number.isNaN(parsedAmount) || parsedAmount === 0 ? 1 : parsedAmount);
  const { tokenInNFTBalance } = useLoaderData<typeof loader>();
  const [collapsed, setCollapsed] = useState(true);
  const [ref, bounds] = useMeasure();
  const { createTokenUrl } = useTrove();
  const [openSelectionModal, setOpenSelectionModal] = useState(false);

  const buttonText =
    amount === "0"
      ? "Select items"
      : `Select ${amount} ${Number(amount) === 1 ? "item" : "items"}`;

  return token ? (
    <div className={cn("overflow-hidden rounded-lg bg-night-1100", className)}>
      <div className="flex items-center justify-between gap-3 p-4">
        <Dialog>
          <TokenSelectDialog
            disabledTokenIds={
              [token.id, otherToken?.id].filter((id) => !!id) as string[]
            }
            isOut={isOut}
            onSelect={onSelect}
          />

          <DialogTrigger asChild>
            <button type="button" className="flex items-center gap-4 text-left">
              <PoolTokenImage className="h-12 w-12" token={token} />
              <div className="flex-1">
                <span className="flex items-center gap-1.5 font-medium text-honey-25 text-sm sm:text-lg">
                  {token.symbol} <ChevronDownIcon className="h-3 w-3" />
                </span>
                {token.isNFT ? (
                  <>
                    {token.name.toUpperCase() !==
                      token.collections[0]?.name.toUpperCase() && (
                      <p className="text-night-400 text-xs sm:text-sm">
                        {token.collections[0]?.name}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    {token.name.toUpperCase() !== token.symbol.toUpperCase() ? (
                      <span className="block text-night-400 text-xs sm:text-sm">
                        {token.name}
                      </span>
                    ) : null}
                  </>
                )}
              </div>
            </button>
          </DialogTrigger>
        </Dialog>
        <div className="space-y-1 text-right">
          {token.isNFT ? (
            selectedNfts.length > 0 ? (
              <div className="flex items-center space-x-2">
                {selectedNfts.length > 5 ? (
                  <div className="flex items-center rounded-md bg-night-900 px-2 py-1.5">
                    <p className="font-semibold text-night-500 text-xs">
                      +{selectedNfts.length - 5}
                    </p>
                  </div>
                ) : null}
                <div
                  className={cn("flex", {
                    "-space-x-5": token.type === "ERC721",
                  })}
                >
                  {selectedNfts
                    .slice(0, Math.min(selectedNfts.length, 5))
                    .map((nft) => {
                      return (
                        <div
                          key={nft.tokenId}
                          className="flex flex-col items-center"
                        >
                          <img
                            className="h-12 w-12 rounded border-2 border-night-1100"
                            src={nft.image.uri}
                            alt={nft.metadata.name}
                          />
                          {token.type === "ERC1155" ? (
                            <p className="text-night-600 text-xs">
                              {nft.quantity}x
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setCollapsed((col) => !col)}
                >
                  <ChevronDownIcon
                    className={cn(
                      "h-4 w-auto transition-transform will-change-transform",
                      !collapsed && "-rotate-180",
                    )}
                  />
                  <span className="sr-only">
                    {collapsed ? "See selected NFTs" : "Close"}
                  </span>
                </Button>
              </div>
            ) : (
              <ClientOnly>
                {() => (
                  <>
                    <Dialog
                      open={openSelectionModal}
                      onOpenChange={setOpenSelectionModal}
                    >
                      {openSelectionModal ? (
                        <SelectionPopup
                          type={isOut ? "vault" : "inventory"}
                          token={token}
                          selectedTokens={selectedNfts}
                          requiredAmount={requiredNftSelectionAmount}
                          onSubmit={onSelectNfts}
                        >
                          {({ amount }) =>
                            requiredNftSelectionAmount ? undefined : (
                              <TotalDisplay
                                amount={amount}
                                isExactOut={isOut}
                              />
                            )
                          }
                        </SelectionPopup>
                      ) : null}
                    </Dialog>
                    <Button
                      variant="dark"
                      size="md"
                      onClick={() => setOpenSelectionModal(true)}
                    >
                      {buttonText}
                    </Button>
                  </>
                )}
              </ClientOnly>
            )
          ) : (
            <ClientOnly>
              {() => (
                <>
                  <CurrencyInput
                    value={amount}
                    onChange={onUpdateAmount}
                    disabled={!!otherToken?.isNFT}
                  />
                  {amountPriceUSD > 0 ? (
                    <span className="block text-night-400 text-sm">
                      {formatUSD(amountPriceUSD)}
                    </span>
                  ) : null}
                </>
              )}
            </ClientOnly>
          )}
        </div>
      </div>
      <motion.div animate={{ height: bounds.height }}>
        <div ref={ref}>
          <AnimatePresence initial={false} mode="popLayout">
            {!collapsed ? (
              <motion.div
                key="collapsed"
                exit={{
                  opacity: 0,
                }}
              >
                <motion.div
                  className="grid max-h-64 grid-cols-4 gap-3 overflow-auto p-4"
                  initial={{ opacity: 0 }}
                  animate={{
                    opacity: 1,
                    transition: {
                      delay: 0.2,
                    },
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  transition={{
                    duration: 0.15,
                  }}
                >
                  {selectedNfts.map((nft) => {
                    return (
                      <div
                        key={nft.tokenId}
                        className="flex flex-col overflow-hidden rounded-lg bg-night-900"
                      >
                        <div className="relative">
                          <img
                            src={nft.image.uri}
                            alt={nft.tokenId}
                            className="w-full"
                          />
                          {token.type === "ERC1155" ? (
                            <span className="absolute right-1.5 bottom-1.5 rounded-lg bg-night-700/80 px-2 py-0.5 font-bold text-night-100 text-xs">
                              {nft.quantity}x
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-start justify-between gap-2 p-2.5">
                          <div className="min-w-0 text-left">
                            <p className="truncate font-medium text-honey-25 text-xs">
                              {nft.metadata.name}
                            </p>
                            <p className="truncate text-[0.6rem] text-night-400">
                              #{nft.tokenId}
                            </p>
                          </div>
                          <a
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`View ${nft.metadata.name} in the marketplace`}
                            className="text-night-400 transition-colors hover:text-night-100"
                            href={createTokenUrl(
                              nft.collectionUrlSlug,
                              nft.tokenId,
                            )}
                          >
                            <ExternalLink
                              className="h-3.5 w-auto"
                              aria-hidden="true"
                            />
                            <span className="sr-only">
                              View {nft.metadata.name} in the marketplace
                            </span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>
      <div className="bg-night-1000 px-4 py-2.5 text-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1">
            <span className="text-night-400 sm:text-sm">
              {token.isNFT && isOut
                ? "Vault"
                : token.isNFT
                  ? "Inventory"
                  : "Balance"}
              :
            </span>
            {token.isNFT ? (
              <>
                {isOut ? (
                  formatAmount(BigInt(token.reserve), {
                    decimals: token.decimals,
                  })
                ) : (
                  <Suspense
                    fallback={
                      <LoaderIcon className="inline-block h-3.5 w-3.5" />
                    }
                  >
                    <Await resolve={tokenInNFTBalance}>
                      {(balance) => formatNumber(balance ?? 0)}
                    </Await>
                  </Suspense>
                )}
              </>
            ) : (
              <VisibleOnClient>
                <span className="font-semibold text-honey-25 sm:text-sm">
                  {formatAmount(balance, { decimals: token.decimals })}
                </span>
              </VisibleOnClient>
            )}
          </div>
          {!token?.isNFT && otherToken?.isNFT ? (
            <InfoPopover>
              Input is disabled because the amount will be auto-calculated based
              on the selected NFTs.
            </InfoPopover>
          ) : null}
          {!token?.isNFT && !otherToken?.isNFT && !isOut ? (
            <Button
              size="xs"
              variant="secondary"
              onClick={() =>
                onUpdateAmount(formatUnits(balance, token.decimals))
              }
            >
              Max
            </Button>
          ) : null}
          {selectedNfts.length > 0 ? (
            <>
              <Dialog
                open={openSelectionModal}
                onOpenChange={setOpenSelectionModal}
              >
                {openSelectionModal ? (
                  <SelectionPopup
                    type={isOut ? "vault" : "inventory"}
                    token={token}
                    selectedTokens={selectedNfts}
                    requiredAmount={requiredNftSelectionAmount}
                    onSubmit={onSelectNfts}
                  >
                    {({ amount }) =>
                      requiredNftSelectionAmount ? undefined : (
                        <TotalDisplay amount={amount} isExactOut={isOut} />
                      )
                    }
                  </SelectionPopup>
                ) : null}
              </Dialog>
              <Button
                variant="ghost"
                onClick={() => setOpenSelectionModal(true)}
              >
                Edit Selection
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  ) : (
    <Dialog>
      <TokenSelectDialog
        disabledTokenIds={[otherToken?.id].filter((id) => !!id) as string[]}
        isOut={isOut}
        onSelect={onSelect}
      />
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "group flex w-full items-center gap-4 rounded-lg bg-night-1100 px-4 py-5 font-medium text-night-400 text-xl transition-colors hover:text-honey-25",
            className,
          )}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-night-800 text-night-600 transition-colors group-hover:text-honey-50">
            <LayersIcon className="h-6 w-6" />
          </div>
          Select Asset
        </button>
      </DialogTrigger>
    </Dialog>
  );
};

const TotalDisplay = ({
  amount,
  isExactOut,
}: {
  amount: string;
  isExactOut: boolean;
}) => {
  const loaderData = useLoaderData<typeof loader>();
  const { amountIn, amountOut, tokenIn, tokenOut } = useSwapRoute({
    ...loaderData,
    amount,
    isExactOut,
  });

  if (!tokenOut || (amountIn === 0n && amountOut === 0n)) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 rounded-lg bg-night-800 p-4">
      <span className="text-night-400 text-sm">Cost:</span>
      <span className="flex items-center gap-1">
        <PoolTokenImage
          token={isExactOut ? tokenIn : tokenOut}
          className="h-4 w-4 flex-shrink-0"
        />
        <span className="truncate font-medium text-honey-25 text-sm">
          {isExactOut
            ? formatAmount(amountIn, {
                decimals: tokenIn.decimals,
              })
            : formatAmount(amountOut, {
                decimals: tokenOut?.decimals,
              })}
        </span>
      </span>
    </div>
  );
};

const TokenSelectDialog = ({
  disabledTokenIds = [],
  isOut,
  onSelect,
}: {
  disabledTokenIds?: string[];
  isOut: boolean;
  onSelect: (token: PoolToken) => void;
}) => {
  const [tab, setTab] = useState<"all" | "tokens" | "collections">("all");
  const [search, setSearch] = useState("");
  const [game, setGame] = useState("");
  const chainId = useChainId();
  const { tokens } = useLoaderData<typeof loader>();

  const gameTokenIdsMap = game ? getTokenIdsMapForGame(game, chainId) : {};
  const gameCollectionIdsMap = game
    ? getCollectionIdsMapForGame(game, chainId)
    : {};

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Select an asset to {isOut ? "buy" : "sell"}</DialogTitle>
        <DialogDescription>
          Choose from the list of tokens and NFTs below.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 rounded-lg bg-night-1100 p-3 sm:p-4">
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <button
              type="button"
              className={cn(
                "flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-2 py-2 font-medium text-night-500 text-sm transition-colors hover:text-honey-25 sm:gap-2.5 sm:px-3",
                tab === "all" && "border-night-800 bg-night-800 text-honey-25",
              )}
              onClick={() => setTab("all")}
            >
              <AllIcon className="h-4 w-4 shrink-0" />
              All
            </button>
            <button
              type="button"
              className={cn(
                "flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-2 py-2 font-medium text-night-500 text-sm transition-colors hover:text-honey-25 sm:gap-2.5 sm:px-3",
                tab === "tokens" &&
                  "border-night-800 bg-night-800 text-honey-25",
              )}
              onClick={() => setTab("tokens")}
            >
              <TokenIcon className="h-4 w-4 shrink-0" />
              Tokens
            </button>
            <button
              type="button"
              className={cn(
                "flex items-center gap-1.5 rounded-lg border border-border bg-transparent px-2 py-2 font-medium text-night-500 text-sm transition-colors hover:text-honey-25 sm:gap-2.5 sm:px-3",
                tab === "collections" &&
                  "border-night-800 bg-night-800 text-honey-25",
              )}
              onClick={() => setTab("collections")}
            >
              <LayersIcon className="h-4 w-4 shrink-0" />
              Collections
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-md border border-night-800 pl-2">
              <SearchIcon className="h-5 w-5 text-night-400" />
              <Input
                type="search"
                placeholder="Search"
                className="h-auto w-auto max-w-[128px] border-none px-2 py-1.5 ring-offset-transparent focus-visible:ring-0 focus-visible:ring-transparent"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {Object.entries(GAME_METADATA).map(
              ([id, { name, image, tokens, collections }]) =>
                chainId in tokens || chainId in collections ? (
                  <button
                    key={id}
                    type="button"
                    className={cn(
                      "flex items-center gap-1 rounded-full border border-night-800 px-2.5 py-1.5 text-xs transition-colors hover:bg-night-800 active:bg-night-900",
                      game === id && "bg-night-900",
                    )}
                    onClick={() => (game === id ? setGame("") : setGame(id))}
                  >
                    <img src={image} alt="" className="h-4 w-4 rounded" />
                    {name}
                  </button>
                ) : null,
            )}
          </div>
        </div>
        <Suspense
          fallback={
            <div className="flex h-80 items-center justify-center">
              <LoaderIcon className="h-6 w-6" />
            </div>
          }
        >
          <Await resolve={tokens}>
            {(tokens) => (
              <ul className="h-80 overflow-auto border-night-900 border-t pt-4">
                {tokens
                  .filter(
                    ({ id, symbol, name, collections, isNFT }) =>
                      // Filter by search query
                      (!search ||
                        symbol.toLowerCase().includes(search.toLowerCase()) ||
                        name.toLowerCase().includes(search.toLowerCase()) ||
                        collections.some((collection) =>
                          collection.name
                            .toLowerCase()
                            .includes(search.toLowerCase()),
                        )) &&
                      // Filter by selected game
                      (!game ||
                        !!gameTokenIdsMap[id] ||
                        collections.some(
                          (collection) =>
                            gameCollectionIdsMap[collection.id.toLowerCase()],
                        )) &&
                      // Filter by selected tab
                      (tab === "all" ||
                        (tab === "collections" ? isNFT : !isNFT)),
                  )
                  .map((token) => (
                    <Token
                      key={token.id}
                      disabled={disabledTokenIds.includes(token.id)}
                      onSelect={onSelect}
                      token={token}
                    />
                  ))}
              </ul>
            )}
          </Await>
        </Suspense>
      </div>
    </DialogContent>
  );
};

const Token = ({
  token,
  disabled,
  onSelect,
}: {
  token: PoolToken;
  disabled: boolean;
  onSelect: (token: PoolToken) => void;
}) => {
  const { address } = useAccount();
  const { data: balance, isLoading } = usePoolTokenBalance({ token, address });
  return (
    <li
      className={cn(
        "relative rounded-lg px-3 py-2 hover:bg-night-900",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PoolTokenImage token={token} className="h-9 w-9" />
          <div className="text-left text-sm">
            <span className="block font-semibold text-honey-25">
              {token.symbol}
            </span>
            {token.name.toUpperCase() !== token.symbol.toUpperCase() ? (
              <span className="block text-night-600">{token.name}</span>
            ) : token.name.toUpperCase() !==
              token.collections[0]?.name.toUpperCase() ? (
              <p className="text-night-400 text-xs sm:text-sm">
                {token.collections[0]?.name}
              </p>
            ) : null}
          </div>
        </div>
        {isLoading ? (
          <LoaderIcon className="h-4 w-4" />
        ) : address ? (
          <p className="text-base-400 text-sm">
            {formatAmount(balance, { decimals: token.decimals })}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        className="absolute inset-0 h-full w-full"
        onClick={() => onSelect(token)}
      />
    </li>
  );
};
