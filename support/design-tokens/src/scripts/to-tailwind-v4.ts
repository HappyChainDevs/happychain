import { existsSync, readFileSync, writeFileSync } from "node:fs"



enum ContentPositionInFile {
    Start = "start of file",
    Theme = "@theme block",
    ThemeInline = "@theme inline block",
    End = "end of file",
}

interface TransformOptions {
    inputPath: string
    outputPath: string
    additionalFiles?: {
        path: string
        location: ContentPositionInFile
        transform?: boolean
    }[]
}

/**
 * Turns a CSS file generated from Terrazzo to a Tailwind V4 config CSS file.
 * 
 * 1. Extract CSS variables from `:root{}` and sanitize to Tailwind V4 friendly naming convention
 * 2. Adds `'hds-'` infix 
 * 
 * For example :
 * `--color-primitive-black` → `--color-hds-primitive-black`
 * `--font-weight-bold` → `--font-hds-weight-bold`
 *
 * 3. Separates variables between 2 groups :
 *   - Direct values in @theme block 
 *   - References in @theme inline (perfect to work on themes easily)
 * 
 * @example 
 * ```bashrc
 *   bun run src/scripts/to-tailwind-v4.ts --input tokens/base.css --output tokens/tailwind.css
 * ```
*/
function toTailwindV4(options: TransformOptions): void {
    const { inputPath, outputPath, additionalFiles = [] } = options

    try {
        const cssContent = readFileSync(inputPath, "utf-8")

        // Extract just the :root{} section (ignoring media queries)
        // Support both :root and *:root* syntax
        const rootRegex = /\*?:root\*?\s*{([^}]*)}/
        const rootMatch = rootRegex.exec(cssContent)

        if (!rootMatch || !rootMatch[1]) {
            throw new Error("Could not find :root{} section in CSS file")
        }

        // Get the content inside the :root{} block and remove the `happy-ds-` prefix
        const rootContent = rootMatch[1].replace(/--happy-ds-/g, "--")

        // Add `hds-` infix to variable name
        function addHdsPrefix(name: string): string {
            return name.replace(/^--([\w]+)-/, "--$1-hds-")
        }

        // 1. Find all CSS variable names in all content
        const varRegex = /--[\w-]+/g
        const allCssVars = new Set<string>()
        let match: RegExpExecArray | null | undefined

        // Find all variables in the :root content
        let contentToSearch = rootContent

        // Include content from additional files that need transformation
        additionalFiles.forEach((file) => {
            if (file.transform && existsSync(file.path)) {
                try {
                    let fileContent = readFileSync(file.path, "utf-8")

                    // Extract content from :root{} (for the files that have it)
                    const rootRegex = /\*?:root\*?\s*{([^}]*)}/
                    const rootMatch = rootRegex.exec(fileContent)

                    if (rootMatch?.[1]) {
                        // Use content from inside the :root{} block
                        fileContent = rootMatch[1].replace(/--happy-ds-/g, "--")
                    }

                    contentToSearch += "\n" + fileContent
                } catch (_err) {
                    console.warn(`⚠️ Warning: Couldn't read additional file for variable scanning: ${file.path}`)
                }
            }
        })

        // 1. Get all CSS variables (--abc)
        while (match !== null) {
            if (match?.[0]) allCssVars.add(match[0])
            match = varRegex.exec(contentToSearch)
        }

        // 2. Create mapping of original to transformed variable names
        const cssVarMappings: Record<string, string> = {}
        Array.from(allCssVars).forEach((v) => {
            cssVarMappings[v] = addHdsPrefix(v)
        })

        // 3. Transform the root content
        let sanitizedRootContent = rootContent

        // Sort variables by length (longest first) to avoid partial replacements
        const sortedCssVars = Object.keys(cssVarMappings).sort((a, b) => b.length - a.length)

        // Replace all occurrences, both in variable declarations and var(--) references
        for (const originalCssVar of sortedCssVars) {
            const sanitizedCssVar = cssVarMappings[originalCssVar]
            const cssVarRegExp = new RegExp(originalCssVar, "g")
            sanitizedRootContent = sanitizedRootContent.replace(cssVarRegExp, sanitizedCssVar)
        }

        // 4. Split into direct values and references
        const directValues: Array<string> = []
        const variableReferences: Array<string> = []

        sanitizedRootContent.split("\n").forEach((line) => {
            const trimmedLine = line.trim()
            if (!trimmedLine || trimmedLine.startsWith("/*")) {
                return
            }

            if (trimmedLine.includes("var(--")) {
                variableReferences.push(trimmedLine)
            } else {
                directValues.push(trimmedLine)
            }
        })

        // 5. Process additional files
        const startContent: Array<string> = []
        const themeContent: Array<string> = []
        const themeInlineContent: Array<string> = []
        const endContent: Array<string> = []

        for (const file of additionalFiles) {
            if (!existsSync(file.path)) {
                console.warn(`⚠️ Warning: File not found: ${file.path}`)
                continue
            }

            try {
                let fileContent = readFileSync(file.path, "utf-8")

                // Apply transformation (if needed)
                if (file.transform) {
                    // Extract content from :root{} block if it's present
                    const rootRegex = /\*?:root\*?\s*{([^}]*)}/
                    const rootMatch = rootRegex.exec(fileContent)

                    if (rootMatch?.[1]) {
                        // Replace content with what's inside our :root{} block
                        fileContent = rootMatch[1].replace(/--happy-ds-/g, "--")
                    }

                    // Sanitize variables in the content
                    for (const originalCssVar of sortedCssVars) {
                        const sanitizedCssVar = cssVarMappings[originalCssVar]
                        const varRegExp = new RegExp(originalCssVar, "g")
                        fileContent = fileContent.replace(varRegExp, sanitizedCssVar)
                    }
                }

                // Add content to the appropriate section (@theme, @theme inline, start or end of the file)
                switch (file.location) {
                    case ContentPositionInFile.Start:
                        startContent.push(fileContent)
                        break
                    case ContentPositionInFile.Theme:
                        // Split content into lines and add each line to directValues
                        fileContent.split("\n").forEach((line) => {
                            const trimmedLine = line.trim()
                            if (trimmedLine && !trimmedLine.startsWith("/*")) {
                                themeContent.push(trimmedLine)
                            }
                        })
                        break
                    case ContentPositionInFile.ThemeInline:
                        // Split content into lines and add each line to variableReferences
                        fileContent.split("\n").forEach((line) => {
                            const trimmedLine = line.trim()
                            if (trimmedLine && !trimmedLine.startsWith("/*")) {
                                themeInlineContent.push(trimmedLine)
                            }
                        })
                        break
                    case ContentPositionInFile.End:
                        endContent.push(fileContent)
                        break
                    default:
                        endContent.push(fileContent)
                        break
                }

                console.log(`✅ Merged content from: ${file.path} (${file.location})`)
            } catch (err) {
                console.warn(`⚠️ Warning: Error processing additional file: ${file.path}`, err)
            }
        }

        const headerComment = `/* -------------------------------------------
 *  Autogenerated. DO NOT EDIT BY HAND !
 * ------------------------------------------- */`

        // Create new CSS with all sections
        const parts = [headerComment]

        // Start of file content (eg: custom fonts declaration)
        if (startContent.length > 0) {
            parts.push(startContent.join("\n"))
        }

        /**
         * Main theme
         * @see https://tailwindcss.com/docs/theme#theme-variable-namespaces
         */
        parts.push("\n@theme {")
        parts.push([...directValues, ...themeContent].join("\n"))
        parts.push("}")

        /**
         * References to other in-theme variables
         * @see https://tailwindcss.com/docs/theme#referencing-other-variables
         */
        parts.push("\n@theme inline {")
        parts.push([...variableReferences, ...themeInlineContent].join("\n"))
        parts.push("}")

        // Additional CSS content that doesn't really fit in any other position
        if (endContent.length > 0) {
            parts.push(endContent.join("\n"))
        }

        // Write our complete Tailwind V4 config
        writeFileSync(outputPath, parts.join("\n"), "utf-8")

        console.log(`✅ Tailwind V4 config generated from ${inputPath}`)
    } catch (error) {
        console.error("Error transforming CSS:", error)
        process.exit(1)
    }
}

// Process command line arguments
const args = process.argv.slice(2)
let inputPath = "input.css"
let outputPath = "output.css"

// Parse command line arguments
for (let i = 0; i < args.length; i++) {
    if (args[i] === "--input" || args[i] === "-i") {
        inputPath = args[++i]
    } else if (args[i] === "--output" || args[i] === "-o") {
        outputPath = args[++i]
    } else if (i === 0 && !args[i].startsWith("-")) {
        // Support for positional arguments for backward compatibility
        inputPath = args[i]
    } else if (i === 1 && !args[i].startsWith("-")) {
        outputPath = args[i]
    }
}

console.log(`
Tailwind V4 transformer
--------------
Input: ${inputPath}
Output: ${outputPath}
`)

const additionalFiles = [
    // Fonts declaration
    {
        path: "src/fonts.css",
        location: ContentPositionInFile.Start,
        transform: false,
    },
    // Raw gradients
    {
        path: "src/gradients.css",
        location: ContentPositionInFile.ThemeInline,
        transform: true,
    },
    // Custom tailwind directives (utilities, variants, custom variants etc)
    {
        path: "src/directives.tw.css",
        location: ContentPositionInFile.End,
        transform: true,
    },
]

// Run the transformation
toTailwindV4({
    inputPath,
    outputPath,
    additionalFiles,
})
