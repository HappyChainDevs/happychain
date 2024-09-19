/**
 * Validates if the input is a valid numeric string.
 */
export const validateNumericInput = (input: string) => {
    return /^\d*\.?\d*$/.test(input)
}

/**
 * Validates if the input is a valid Ethereum address.
 */
export const validateAddressInput = (input: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(input)
}
