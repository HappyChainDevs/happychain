import { AnimatePresence, motion } from "framer-motion";
import {
  TableIcon as ColumnIcon,
  ExternalLink,
  LayoutGridIcon as GridIcon,
  RotateCwIcon as RefreshIcon,
  XIcon,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { useAccount } from "wagmi";

import { DialogClose, DialogContent } from "~/components/ui/Dialog";
import { useTrove } from "~/hooks/useTrove";
import { useVaultItems } from "~/hooks/useVaultItems";
import { formatNumber } from "~/lib/number";
import { countTokens } from "~/lib/tokens";
import { cn } from "~/lib/utils";
import type { PoolToken, TroveToken, TroveTokenWithQuantity } from "~/types";
import { CheckIcon, LoaderIcon } from "./Icons";
import { PoolTokenImage } from "./pools/PoolTokenImage";
import { Button } from "./ui/Button";
import IconToggle from "./ui/IconToggle";
import { NumberSelect } from "./ui/NumberSelect";

const ItemCard = ({
  selected,
  item,
  quantity,
  onClick,
  disabled,
  viewOnly,
  compact,
}: {
  selected: boolean;
  item: TroveToken;
  quantity: number;
  onClick: () => void;
  disabled: boolean;
  viewOnly: boolean;
  compact: boolean;
}) => {
  const { createTokenUrl } = useTrove();
  const disableUnselected = !selected && disabled;

  const innerCard = (
    <div
      className={cn(
        "w-full",
        disableUnselected && "cursor-not-allowed opacity-30",
      )}
    >
      {selected && (
        <div className="absolute top-2 right-2 z-20 flex h-4 w-4 items-center justify-center rounded-[3px] border-2 border-night-1200 bg-night-100 text-night-1200">
          <CheckIcon className="w-3" />
        </div>
      )}
      <div className="relative">
        <img
          src={item.image.uri}
          alt={item.tokenId}
          className={cn(
            "w-full",
            !viewOnly && !disableUnselected && "group-hover:opacity-75",
          )}
        />
        {quantity > 1 ? (
          <span className="absolute right-1.5 bottom-1.5 rounded-lg bg-night-700/80 px-2 py-0.5 font-bold text-night-100 text-xs">
            {formatNumber(quantity)}x
          </span>
        ) : null}
      </div>
      {!compact ? (
        <div className="flex items-start justify-between gap-2 p-2.5">
          <div className="text-left">
            <p className="font-medium text-honey-25 text-xs sm:text-sm">
              {item.metadata.name}
            </p>
            <p className="text-night-400 text-sm">#{item.tokenId}</p>
          </div>
          <a
            target="_blank"
            rel="noopener noreferrer"
            title={`View ${item.metadata.name} in the marketplace`}
            className="text-night-400 transition-colors hover:text-night-100"
            href={createTokenUrl(item.collectionUrlSlug, item.tokenId)}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-4 w-4" />
            <span className="sr-only">
              View {item.metadata.name} in the marketplace
            </span>
          </a>
        </div>
      ) : null}
    </div>
  );

  if (viewOnly) {
    return (
      <div className="overflow-hidden rounded-lg bg-night-900">{innerCard}</div>
    );
  }

  return (
    <button
      type="button"
      className={cn(
        "group relative flex items-start overflow-hidden rounded-lg bg-night-900",
        selected && "ring-2 ring-night-100",
      )}
      onClick={onClick}
      disabled={disableUnselected}
    >
      {!disableUnselected ? (
        <span className="sr-only">Select {item.metadata.name}</span>
      ) : null}
      {innerCard}
    </button>
  );
};

type BaseProps = {
  token: PoolToken;
  type: "vault" | "inventory";
};

type ViewOnlyProps = BaseProps & {
  viewOnly: true;
};

type EditableProps = BaseProps & {
  viewOnly?: false;
  selectedTokens?: TroveTokenWithQuantity[];
  requiredAmount?: number;
  onSubmit: (items: TroveTokenWithQuantity[]) => void;
  children?: (renderProps: { amount: string }) => React.ReactNode;
};

type Props = ViewOnlyProps | EditableProps;

export const SelectionPopup = ({ token, type, ...props }: Props) => {
  const { address } = useAccount();
  const {
    results: vaultItems,
    isLoading,
    refetch,
  } = useVaultItems({
    id: token.id,
    type: type === "vault" ? "reserves" : "inventory",
    address,
    enabled: token.isNFT,
  });
  const [selectedItems, setSelectedItems] = useState<TroveTokenWithQuantity[]>(
    !props.viewOnly ? (props.selectedTokens ?? []) : [],
  );
  const [isCompactMode, setIsCompactMode] = useState(false);

  const selectedQuantity = selectedItems.reduce(
    (acc, curr) => acc + curr.quantity,
    0,
  );
  const selectionDisabled =
    !props.viewOnly && props.requiredAmount
      ? selectedQuantity === props.requiredAmount
      : false;
  const buttonDisabled =
    !props.viewOnly && props.requiredAmount
      ? selectedQuantity !== props.requiredAmount
      : selectedItems.length === 0;

  const selectionHandler = (item: TroveTokenWithQuantity) => {
    if (selectedItems.some((i) => i.tokenId === item.tokenId)) {
      const itemIndex = selectedItems.findIndex(
        (i) => i.tokenId === item.tokenId,
      );
      setSelectedItems([
        ...selectedItems.slice(0, itemIndex),
        ...selectedItems.slice(itemIndex + 1),
      ]);
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  return (
    <DialogContent
      className={cn(
        "h-full [grid-template-rows:auto_auto_1fr_1fr_25%] sm:max-w-8xl",
        !props.viewOnly
          ? "grid-areas-nft-modal-mobile lg:grid-areas-nft-modal lg:[grid-template-columns:repeat(4,1fr)_25%]"
          : "grid-areas-nft-modal-viewonly",
      )}
    >
      <div className="grid-in-header flex items-center gap-2 text-xs sm:text-base">
        <p className="text-night-400">{props.viewOnly ? "View" : "Select"}</p>
        <PoolTokenImage className="h-6 w-6" token={token} />
        <p className="font-medium text-md text-night-100 capitalize">
          {token.name}{" "}
          <span className="text-night-400 normal-case">
            from {type === "vault" ? "the Vault" : "your Inventory"}
          </span>
        </p>
      </div>
      <div className="grid-in-misc space-y-4">
        <div className="flex items-stretch gap-3">
          <IconToggle
            icons={[
              {
                id: "full",
                icon: GridIcon,
              },
              {
                id: "compact",
                icon: ColumnIcon,
              },
            ]}
            onChange={(id) => setIsCompactMode(id === "compact")}
          />
          <button
            type="button"
            onClick={refetch}
            className="group rounded-md px-2 text-night-600 transition-colors hover:bg-night-1000 hover:text-night-100"
          >
            <RefreshIcon className="h-4 w-4 group-hover:animate-rotate-45" />
          </button>
        </div>
      </div>
      <div className="grid-in-nft flex flex-col overflow-hidden rounded-lg">
        <div className="relative flex-1 overflow-auto bg-night-1100 p-4">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <LoaderIcon className="h-8 w-8" />
            </div>
          ) : (
            <div
              className={cn(
                "grid gap-3",
                isCompactMode
                  ? "grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
                  : "grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
              )}
            >
              {vaultItems.map((item) => (
                <ItemCard
                  disabled={selectionDisabled}
                  selected={selectedItems.some(
                    (i) => i.tokenId === item.tokenId,
                  )}
                  key={item.tokenId}
                  item={item}
                  quantity={item.queryUserQuantityOwned ?? 1}
                  viewOnly={props.viewOnly || false}
                  compact={isCompactMode}
                  onClick={() => {
                    selectionHandler({
                      ...item,
                      quantity:
                        !props.viewOnly && props.requiredAmount
                          ? Math.min(
                              props.requiredAmount - selectedQuantity,
                              item.queryUserQuantityOwned ?? 1,
                            )
                          : 1,
                    });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      {!props.viewOnly && (
        <div className="grid-in-selection flex flex-col gap-4 rounded-lg bg-night-1100 p-3">
          <div className="flex min-h-full flex-col">
            <p className="flex items-center justify-between gap-2 text-night-400 text-sm leading-[160%]">
              Selected items
              {selectedItems.length > 0 ? (
                <Button
                  size="xs"
                  className="p-0 text-[#28A0F0] hover:bg-transparent hover:text-[#28A0F0]/90"
                  variant="ghost"
                  onClick={() => setSelectedItems([])}
                >
                  Clear
                </Button>
              ) : null}
            </p>
            {selectedItems.length > 0 ? (
              <div className="mt-2 flex flex-1 flex-col gap-2 overflow-auto pr-2">
                <AnimatePresence initial={false} mode="popLayout">
                  {selectedItems.map((item) => (
                    <motion.div
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex w-full items-center justify-between space-x-2 rounded-lg bg-night-900 p-2"
                      key={item.tokenId}
                    >
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img
                            src={item.image.uri}
                            alt={item.metadata.name}
                            className="h-10 w-10 rounded"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded bg-night-800" />
                        )}
                        <div className="flex min-w-0 flex-1 flex-col">
                          <p className="truncate font-medium text-honey-25 text-sm">
                            {item.metadata.name}
                          </p>
                          <p className="text-night-400 text-sm">
                            #{item.tokenId}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.contractType === "ERC1155" && (
                          <NumberSelect
                            onChange={(num) => {
                              setSelectedItems((prev) =>
                                prev.map((i) =>
                                  i.tokenId === item.tokenId
                                    ? { ...i, quantity: num }
                                    : i,
                                ),
                              );
                            }}
                            value={item.quantity}
                            max={item.queryUserQuantityOwned || 1}
                          />
                        )}
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => selectionHandler(item)}
                        >
                          <XIcon className="w-4 text-night-400" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <p className="flex grow items-center justify-center text-night-600 text-xs">
                You haven't selected any items yet.
              </p>
            )}
            <div className="sticky bottom-0 mt-2 space-y-3 bg-night-1100/50 backdrop-blur-sm">
              {!props.viewOnly &&
                props.children &&
                props.children({
                  amount: String(countTokens(selectedItems)),
                })}
              <DialogClose asChild>
                <Button
                  disabled={buttonDisabled}
                  size="md"
                  className="w-full"
                  onClick={() => props.onSubmit(selectedItems)}
                >
                  {props.requiredAmount && buttonDisabled
                    ? `Select ${props.requiredAmount} ${props.requiredAmount === 1 ? "item" : "items"}`
                    : "Save selections"}
                </Button>
              </DialogClose>
            </div>
          </div>
        </div>
      )}
    </DialogContent>
  );
};
