import { formatUnits, parseUnits } from "viem";

import type { NumberString } from "~/types";

export const formatNumber = (
  value: number | string,
  options?: Intl.NumberFormatOptions,
) =>
  (typeof value === "string" ? Number.parseFloat(value) : value).toLocaleString(
    "en-US",
    options,
  );

export const formatPercent = (
  percentage: string | number,
  maximumFractionDigits = 2,
) => {
  const number =
    (typeof percentage === "string"
      ? Number.parseFloat(percentage)
      : percentage) * 100;
  return `${formatNumber(number, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  })}%`;
};

export const floorBigInt = (value: bigint, decimals = 18) =>
  parseUnits(
    Math.floor(Number(formatUnits(value, decimals))).toString() as NumberString,
    decimals,
  );

export const ceilBigInt = (value: bigint, decimals = 18) =>
  parseUnits(
    Math.ceil(Number(formatUnits(value, decimals))).toString() as NumberString,
    decimals,
  );

export const bigIntToNumber = (value: bigint, decimals = 18) =>
  Number(formatUnits(value, decimals));
