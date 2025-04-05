import { writeFileSync } from "node:fs"
import { REGEX, findCssVariableNames, safeReadFile } from "./helpers"

/**
 * Utility script to transform DTCG compliant CSS variables generated from Terrazzo CLI
 * into a Tailwind V4 CSS-first configuration file (`tailwind.css`). It ensures that :
 *
 * 1. The CSS variable declarations match Tailwind V4 naming convention and
 *    are scoped to the proper directive block format (`@theme` or `theme inline`).
 *
 * 2. All CSS variables have the prefix (-hds-) to make sure that our variables
 *    are properly namespaced and won't conflict with Tailwind's built-in variables.
 *
 * 3. Additional CSS declarations  defined in separate files are merged into
 *    a single coherent Tailwind config file.
 *
 * @see {@link https://tailwindcss.com/docs/theme} Tailwind V4 theming documentation
 */

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
 * Creates mappings from original CSS variable names to Tailwind V4 compatible names.
 * Adds the 'hds-' infix to ensure unique variable names within our design system.
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
        console.log(`Reading input CSS from: ${inputPath}`)
        const terrazzoCss = safeReadFile(inputPath, true)
        if (!terrazzoCss) return

        // 3. Extract and collect CSS variables for transformation
        const terrazzoCssVariables = extractCssVariables(terrazzoCss)
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
        const cssVariables = findCssVariableNames(allCssContent)
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
        console.log(`✅ Tailwind V4 config generated successfully and written to: ${outputPath}`)
    } catch (error) {
        console.error("❌ Error generating Tailwind config:", error)
        process.exit(1)
    }
}

/**
 * Main function
 */
function main(): void {
    // Get command line arguments
    const args = process.argv.slice(2)

    // Handle both positional and named arguments
    let inputPath = "input.css"
    let outputPath = "output.css"

    // Try to get positional arguments first
    if (args.length >= 1 && !args[0].startsWith("--")) {
        inputPath = args[0]
    }

    if (args.length >= 2 && !args[1].startsWith("--")) {
        outputPath = args[1]
    }

    // Also check for named arguments
    for (let i = 0; i < args.length; i++) {
        if ((args[i] === "--input" || args[i] === "-i") && i + 1 < args.length) {
            inputPath = args[++i]
        } else if ((args[i] === "--output" || args[i] === "-o") && i + 1 < args.length) {
            outputPath = args[++i]
        }
    }

    console.log("Tailwind V4 transformer")
    console.log("--------------")
    console.log(`Input: ${inputPath}`)
    console.log(`Output: ${outputPath}`)

    const additionalFiles = [
        {
            path: "src/fonts.css",
            location: ContentPositionInFile.Start,
            transform: false,
        },
        {
            path: "src/animations.css",
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

// Run the script if this file is executed directly
if (require.main === module) {
    main()
}
