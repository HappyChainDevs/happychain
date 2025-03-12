import { existsSync, readFileSync } from "node:fs"

/**
 * Common regex patterns for CSS processing
 */
export const REGEX = {
    rootBlock: /\*?:root\*?\s*{([^}]*)}/,
    cssVariableName: /--[\w-]+/g,
    legacyDesignSystemPrefix: /--happy-ds-/g,
    cssVariableReference: /var\((--[\w-]+)\)/g,
    hdsInfixPattern: /^--([\w]+)-hds-/,
    addHdsInfix: /^--([\w]+)-/,
    commentPattern: /\/\*.*?\*\//,
    createDeclarationPattern: (varName: string) => new RegExp(`${varName}\\s*:`, "g"),
}

/**
 * Safely read a file with optional error handling for required files
 *
 * @param filePath - Path to the file to read
 * @param isRequired - Whether the file is required (throws error if not found)
 * @returns The file content as a string, or null if file not found/error reading
 */
export function safeReadFile(filePath: string, isRequired = false): string | null {
    try {
        if (!existsSync(filePath)) {
            if (isRequired) {
                throw new Error(`Required file not found: ${filePath}`)
            }
            console.warn(`File not found: ${filePath}`)
            return null
        }
        return readFileSync(filePath, "utf-8")
    } catch (error) {
        if (isRequired) {
            throw new Error(`Error reading required file: ${filePath}`)
        }
        console.warn(`Error reading file: ${filePath}`, error)
        return null
    }
}

/**
 * Find all CSS variable names in a string
 *
 * @param content - CSS content to search for variable names
 * @returns A Set of all unique CSS variable names found
 */
export function findCssVariableNames(content: string): Set<string> {
    const variables = new Set<string>()
    // Reset regex lastIndex to ensure we start from the beginning
    REGEX.cssVariableName.lastIndex = 0

    let match = REGEX.cssVariableName.exec(content)
    while (match !== null) {
        variables.add(match[0])
        match = REGEX.cssVariableName.exec(content)
    }

    return variables
}
