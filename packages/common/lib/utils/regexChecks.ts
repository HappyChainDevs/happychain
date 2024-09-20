/**
 * Validates if the input is a valid numeric string.
 */
export const validateNumericInput = (input: string) => {
    return /^\d*\.?\d*$/.test(input)
}
