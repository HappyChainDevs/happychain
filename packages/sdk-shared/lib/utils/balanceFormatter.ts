import { formatEther } from "viem"

/**
 * Formats a given balance (in wei) to a string representation with commas (or localized grouping separators)
 * and specified decimal places. If the balance is undefined, it returns a default value of "0.0".
 *
 * This function:
 * - Converts the balance from `wei` (bigint) to Ether using viem's `formatEther`.
 * - Uses `Intl.NumberFormat` to format the number according to the user's locale, adding commas (or the appropriate
 *   grouping separator for thousands) and controlling the number of decimal places.
 *
 * @param {bigint | undefined} balanceValue - The balance in wei (as a bigint) to be formatted. Can be `undefined`.
 * @param {number} [decimals=3] - The number of decimal places to display. Defaults to 3 if not provided.
 *
 * @returns {string} - A formatted string representing the balance in Ether, with commas and specified decimal places.
 * If `balanceValue` is undefined, the function returns "0.0".
 *
 * ### How {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat | `Intl.NumberFormat`} Works:
 * - `Intl.NumberFormat` is a built-in JavaScript object that formats numbers based on the specified locale (in this case,
 *   the user's locale, derived from `navigator.language`).
 * - It automatically adds the appropriate thousands separator (e.g., commas in the US, spaces in many European countries)
 *   and allows you to control the number of decimal places using `minimumFractionDigits` and `maximumFractionDigits`.
 *
 * ### Example Inputs and Outputs:
 * 1. **Input**: `balanceValue = BigInt("1234500000000000000"), decimals = 3`
 *    **Output** (for `en-US` locale): `"1.234"`
 *    **Output** (for `de-DE` locale): `"1,234"` (comma used as the decimal separator)
 *
 * 2. **Input**: `balanceValue = BigInt("1000000000000000000000"), decimals = 2`
 *    **Output** (for `en-US` locale): `"1,000.00"`
 *    **Output** (for `fr-FR` locale): `"1 000,00"` (space used for grouping, comma as decimal separator)
 *
 * 3. **Input**: `balanceValue = undefined`
 *    **Output**: `"0.0"`
 */
export const formatUserBalance = (balanceValue?: bigint, decimals = 3) =>
    balanceValue !== undefined
        ? new Intl.NumberFormat(navigator.language, {
              minimumFractionDigits: decimals,
              maximumFractionDigits: decimals,
          }).format(Number.parseFloat(formatEther(balanceValue)))
        : "0.0"
