import { existsSync, readFileSync, writeFileSync } from "node:fs"

const REGEX = {
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
 * Specifies where content should be placed in the output Tailwind CSS file
 */
enum ContentPositionInFile {
    /** Content at the beginning of the file (eg: custom font declarations) */
    Start = "start of file",

    /** Direct CSS variable declarations in the @theme block */
    Theme = "@theme block",

    /** CSS variable references in the @theme inline block */
    ThemeInline = "@theme inline block",

    /** Content at the end of the file (eg: custom directives) */
    End = "end of file",
}

interface TransformOptions {
    inputPath: string
    outputPath: string
    additionalFiles?: Array<{
        path: string
        location: ContentPositionInFile
        transform?: boolean
    }>
}

interface FileContentResult {
    content: string
    isRootContent: boolean
}

function safeReadFile(filePath: string, isRequired = false): string | null {
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
 * Extracts CSS variable declarations from the `:root{}` block of a CSS file
 * and remove the design system prefix.
 */
function extractCssVariables(rawCss: string): FileContentResult {
    // Extract :root{} content
    const rootMatch = REGEX.rootBlock.exec(rawCss)

    if (rootMatch?.[1]) {
        // Remove Terrazzo generated prefixes to make CSS variables match Tailwind naming conventions
        const tailwindCompliantCssVar = rootMatch[1].replace(REGEX.legacyDesignSystemPrefix, "--")
        return { content: tailwindCompliantCssVar, isRootContent: true }
    }

    // If not in :root{} block, return unchanged full content
    return { content: rawCss, isRootContent: false }
}

/**
 * List all CSS variables present
 */
function findCssVariables(rawCss: string): Set<string> {
    const cssVariables = new Set<string>()
    let match: RegExpExecArray | null = REGEX.cssVariableName.exec(rawCss)

    while (match !== null) {
        cssVariables.add(match[0])
        match = REGEX.cssVariableName.exec(rawCss)
    }
    return cssVariables
}

/**
 * Creates mappings from original CSS variable names to Tailwind V4 compatible names.
 * Adds the 'hds-' infix to ensure unique variable names within our design system.
 *
 * @see {@link https://tailwindcss.com/docs/theme#default-theme-variable-reference}
 */
function buildVariableMappings(cssVariables: Set<string>): Record<string, string> {
    const mappings: Record<string, string> = {}

    for (const variable of cssVariables) {
        // Skip if variable already has -hds infix in the right position
        mappings[variable] = variable.match(REGEX.hdsInfixPattern)
            ? variable
            : variable.replace(REGEX.addHdsInfix, "--$1-hds-")
    }

    return mappings
}

/**
 * Transforms raw CSS by replacing variable names according to the provided mappings.
 * Handles both variable declarations and variable references in var(--) functions.
 */
function applyCssTransformations(rawCss: string, variableMappings: Record<string, string>): string {
    let result = rawCss

    // Process variables from longest to shortest to avoid partial replacements
    const sortedVars = Object.keys(variableMappings).sort((a, b) => b.length - a.length)

    // First, transform variable declarations
    for (const originalVar of sortedVars) {
        const transformedVar = variableMappings[originalVar]
        result = result.replace(REGEX.createDeclarationPattern(originalVar), `${transformedVar}:`)
    }

    // Then, transform variable references
    return result.replace(REGEX.cssVariableReference, (match, varName) =>
        varName in variableMappings ? `var(${variableMappings[varName]})` : match,
    )
}

/**
 * Processes raw CSS for transformation
 */
function processRawCss(rawCss: string, applyTransform: boolean, variableMappings: Record<string, string>): string {
    if (!applyTransform) return rawCss

    const extractResult = extractCssVariables(rawCss)

    // Only transform raw css if it's from a :root block or if transformation is explicitly requested
    return extractResult.isRootContent
        ? applyCssTransformations(extractResult.content, variableMappings)
        : applyCssTransformations(rawCss, variableMappings)
}

/**
 * Determines if a CSS line should be in `@theme` or `@theme inline` based on
 * whether it references other variables
 *
 * @see {@link https://tailwindcss.com/docs/theme#referencing-other-variables}
 */
function determineThemePosition(cssLine: string): ContentPositionInFile {
    return cssLine.includes("var(--") ? ContentPositionInFile.ThemeInline : ContentPositionInFile.Theme
}

/**
 * Processes a line of CSS content, skipping comments and empty lines
 */
function processContentLine(
    line: string,
    sectionContent: Record<ContentPositionInFile, string[]>,
    location?: ContentPositionInFile,
): void {
    const trimmedLine = line.trim()

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith("/*")) return

    // Determine where this line belongs
    const sectionType = location || determineThemePosition(trimmedLine)
    sectionContent[sectionType].push(trimmedLine)
}

/**
 * Transforms a CSS file from Terrazzo format to Tailwind V4 CSS-first config.
 * @see {@link https://tailwindcss.com/docs/theme}
 */
function toTailwindV4Config({ inputPath, outputPath, additionalFiles = [] }: TransformOptions): void {
    try {
        // 1. Initialize content containers by section
        const sectionContent: Record<ContentPositionInFile, string[]> = {
            [ContentPositionInFile.Start]: [],
            [ContentPositionInFile.Theme]: [],
            [ContentPositionInFile.ThemeInline]: [],
            [ContentPositionInFile.End]: [],
        }

        // 2. Read the main input file
        const terrazzoCss = safeReadFile(inputPath, true)

        // 3. Extract and collect CSS variables for transformation
        const terrazzoCssVariables = extractCssVariables(terrazzoCss!)
        let allCssContent = terrazzoCssVariables.content

        // 4. Collect additional css for variable scanning
        const validAdditionalCssFiles = additionalFiles.filter((file) => file.transform)

        for (const file of validAdditionalCssFiles) {
            const rawCss = safeReadFile(file.path)
            if (!rawCss) continue

            const additionalCssVars = extractCssVariables(rawCss)
            allCssContent += "\n" + additionalCssVars.content
        }

        // 5. Build variable mappings
        const cssVariables = findCssVariables(allCssContent)
        const variableMappings = buildVariableMappings(cssVariables)

        // 6. Process and categorize main file content

        applyCssTransformations(terrazzoCssVariables.content, variableMappings)
            .split("\n")
            .forEach((line) => {
                processContentLine(line, sectionContent)
            })

        // 7. Process additional files
        for (const file of additionalFiles) {
            const fileContent = safeReadFile(file.path)
            if (!fileContent) continue

            const processedContent = processRawCss(fileContent, !!file.transform, variableMappings)

            // Handle content based on file location
            if (file.location === ContentPositionInFile.Start || file.location === ContentPositionInFile.End) {
                // For start and end sections, keep content as a whole
                sectionContent[file.location].push(processedContent)
            } else {
                // For @theme sections, process line by line
                processedContent.split("\n").forEach((line) => {
                    processContentLine(line, sectionContent, file.location)
                })
            }

            console.log(`Ingested and processed ${file.path}`)
        }

        // 8. Build output part by part
        const outputParts = [
            `/* -------------------------------------------
 *  Autogenerated. DO NOT EDIT BY HAND !
 * ------------------------------------------- */`,
        ]

        // Add start block
        if (sectionContent[ContentPositionInFile.Start].length > 0) {
            outputParts.push(sectionContent[ContentPositionInFile.Start].join("\n"))
        }

        // Add @theme blocks
        outputParts.push("\n@theme {")
        if (sectionContent[ContentPositionInFile.Theme].length > 0) {
            outputParts.push(sectionContent[ContentPositionInFile.Theme].join("\n"))
        }
        outputParts.push("}")

        outputParts.push("\n@theme inline {")
        if (sectionContent[ContentPositionInFile.ThemeInline].length > 0) {
            outputParts.push(sectionContent[ContentPositionInFile.ThemeInline].join("\n"))
        }
        outputParts.push("}")

        // Add end block
        if (sectionContent[ContentPositionInFile.End].length > 0) {
            outputParts.push(sectionContent[ContentPositionInFile.End].join("\n"))
        }

        // 9. Write the final output file
        writeFileSync(outputPath, outputParts.join("\n"), "utf-8")
        console.log("✅ Tailwind V4 config generated successfully !")
    } catch (error) {
        console.error("❌ Error generating Tailwind config :", error)
        process.exit(1)
    }
}

/**
 * Parses CLI arguments to extract input and output file paths.
 */
function parseCliArgs(args: string[]): { inputPath: string; outputPath: string } {
    const options = {
        inputPath: "input.css",
        outputPath: "output.css",
    }

    // Process named arguments
    for (let i = 0; i < args.length; i++) {
        if ((args[i] === "--input" || args[i] === "-i") && i + 1 < args.length) {
            options.inputPath = args[++i]
        } else if ((args[i] === "--output" || args[i] === "-o") && i + 1 < args.length) {
            options.outputPath = args[++i]
        }
    }

    // Process positional arguments
    if (args.length > 0 && !args[0].startsWith("-")) options.inputPath = args[0]
    if (args.length > 1 && !args[1].startsWith("-")) options.outputPath = args[1]

    return options
}

function main(): void {
    const { inputPath, outputPath } = parseCliArgs(process.argv.slice(2))

    console.log(`
Tailwind V4 transformer
--------------
Input: ${inputPath}
Output: ${outputPath}
`)

    const additionalFiles = [
        {
            path: "src/fonts.css",
            location: ContentPositionInFile.Start,
            transform: false,
        },
        {
            path: "src/gradients.css",
            location: ContentPositionInFile.ThemeInline,
            transform: true,
        },
        {
            path: "src/directives.tw.css",
            location: ContentPositionInFile.End,
            transform: true,
        },
    ]

    toTailwindV4Config({
        inputPath,
        outputPath,
        additionalFiles,
    })
}

main()
