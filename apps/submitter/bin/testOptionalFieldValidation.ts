import { ArkErrors, type } from "arktype"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { validateOutput, validateSerializedOutput } from "#lib/utils/validation/helpers"

// =====================================================================================================================
// TYPES
// =====================================================================================================================

// Define a simple interface with a bigint field and optional fields
interface TestInterface {
    id: string
    value: bigint
    description?: string
    metadata?: never
}

// Define a serialized version of the interface
type SerializedTestInterface = {
    id: string
    value: string
    description?: string
    metadata?: never
}

// =====================================================================================================================
// VALIDATION SCHEMAS
// =====================================================================================================================

// Schema with type.never for optional field
const neverSchema = type({
    id: "string",
    value: /^-?[0-9]+(n)?$/,
    description: type.never.optional(),
})

// Schema with type.undefined for optional field
const undefinedSchema = type({
    id: "string",
    value: /^-?[0-9]+(n)?$/,
    description: type.undefined.optional(),
})

// Schema with string.optional() for optional field
const optionalStringSchema = type({
    id: "string",
    value: /^-?[0-9]+(n)?$/,
    description: type.string.optional(),
})

// Schema with optional metadata field
const metadataSchema = type({
    id: "string",
    value: /^-?[0-9]+(n)?$/,
    metadata: type.never.optional(),
})

// =====================================================================================================================
// TEST DATA
// =====================================================================================================================

// Test object with bigint value
const testObject: TestInterface = {
    id: "test-1",
    value: 1000000000n,
}

// Test object with description
const testObjectWithDescription: TestInterface = {
    id: "test-2",
    value: 1000000000n,
    description: "Test description",
}

// Serialized test object
const serializedTestObject: SerializedTestInterface = {
    id: "test-1",
    value: "1000000000",
}

// Serialized test object with description
const serializedTestObjectWithDescription: SerializedTestInterface = {
    id: "test-2",
    value: "1000000000",
    description: "Test description",
}

// =====================================================================================================================
// HELPER FUNCTIONS
// =====================================================================================================================

// Helper function to safely format error messages
function formatError(err: unknown): string {
    if (err instanceof ArkErrors) {
        return err.toString().substring(0, 200) + "..."
    }
    return String(err).substring(0, 200) + "..."
}

// Helper function to run validation tests
function runValidationTest(
    testName: string,
    object: unknown,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    schema: any, // Using any here because we need to pass the schema to validation functions
    useSerializedOutput = false,
): void {
    console.log(`\n=== ${testName} ===`)
    try {
        if (useSerializedOutput) {
            validateSerializedOutput(object, schema)
        } else {
            validateOutput(object, schema)
        }
        console.log("✅ Validation passed")
    } catch (err) {
        console.error("❌ Validation failed:", formatError(err))
    }
}

// =====================================================================================================================
// MAIN TEST FUNCTION
// =====================================================================================================================

async function run() {
    console.log("=== TESTING OPTIONAL FIELD VALIDATION ===\n")

    // Test with type.never
    console.log("--- TESTING TYPE.NEVER ---")
    runValidationTest("Object without description using type.never", testObject, neverSchema)
    runValidationTest("Object with description using type.never", testObjectWithDescription, neverSchema)
    runValidationTest("Serialized object without description using type.never", serializedTestObject, neverSchema)
    runValidationTest(
        "Serialized object with description using type.never",
        serializedTestObjectWithDescription,
        neverSchema,
    )

    // Test with type.undefined
    console.log("\n--- TESTING TYPE.UNDEFINED ---")
    runValidationTest("Object without description using type.undefined", testObject, undefinedSchema)
    runValidationTest("Object with description using type.undefined", testObjectWithDescription, undefinedSchema)
    runValidationTest(
        "Serialized object without description using type.undefined",
        serializedTestObject,
        undefinedSchema,
    )
    runValidationTest(
        "Serialized object with description using type.undefined",
        serializedTestObjectWithDescription,
        undefinedSchema,
    )

    // Test with string.optional()
    console.log("\n--- TESTING STRING.OPTIONAL() ---")
    runValidationTest("Object without description using string.optional()", testObject, optionalStringSchema)
    runValidationTest(
        "Object with description using string.optional()",
        testObjectWithDescription,
        optionalStringSchema,
    )
    runValidationTest(
        "Serialized object without description using string.optional()",
        serializedTestObject,
        optionalStringSchema,
    )
    runValidationTest(
        "Serialized object with description using string.optional()",
        serializedTestObjectWithDescription,
        optionalStringSchema,
    )

    // Test with validateSerializedOutput
    console.log("\n--- TESTING VALIDATESERIALIZEDOUTPUT ---")
    runValidationTest("Object without description using validateSerializedOutput", testObject, neverSchema, true)
    runValidationTest(
        "Object with description using validateSerializedOutput",
        testObjectWithDescription,
        neverSchema,
        true,
    )

    // Test metadata field
    console.log("\n--- TESTING METADATA FIELD ---")
    runValidationTest("Object with metadata field", testObject, metadataSchema)
}

// =====================================================================================================================
// SERVER SETUP
// =====================================================================================================================

// Create a simple API for testing
const api = new Hono().use(
    "*",
    cors({
        origin: "*",
        allowMethods: ["GET", "POST", "OPTIONS"],
    }),
)

// Route that returns a test object without description
api.get("/test-never", (c) => {
    return c.json(serializedTestObject)
})

// Route that returns a test object with description
api.get("/test-undefined", (c) => {
    return c.json(serializedTestObjectWithDescription)
})

// Route that returns a test object with optional string
api.get("/test-optional-string", (c) => {
    return c.json(serializedTestObjectWithDescription)
})

// Route that shows the validation schemas
api.get("/schemas", (c) => {
    return c.json({
        neverSchema: neverSchema.toString(),
        undefinedSchema: undefinedSchema.toString(),
        optionalStringSchema: optionalStringSchema.toString(),
        metadataSchema: metadataSchema.toString(),
    })
})

// Route that shows the test data
api.get("/test-data", (c) => {
    return c.json({
        testObject: {
            ...testObject,
            value: testObject.value.toString(),
        },
        testObjectWithDescription: {
            ...testObjectWithDescription,
            value: testObjectWithDescription.value.toString(),
        },
        serializedTestObject,
        serializedTestObjectWithDescription,
    })
})

// Home page with links
api.get("/", (c) => {
    return c.html(`
        <html>
            <head>
                <title>Optional Field Validation Test</title>
                <style>
                    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
                    h1 { color: #333; }
                    ul { list-style-type: none; padding: 0; }
                    li { margin-bottom: 1rem; }
                    a { color: #0077cc; text-decoration: none; }
                    a:hover { text-decoration: underline; }
                    pre { background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow: auto; }
                </style>
            </head>
            <body>
                <h1>Optional Field Validation Test</h1>
                <p>This is a test server for optional field validation with different arktype approaches.</p>
                
                <h2>Test Endpoints</h2>
                <ul>
                    <li><a href="/test-never">/test-never</a> - Test object without description (type.never)</li>
                    <li><a href="/test-undefined">/test-undefined</a> - Test object with description (type.undefined)</li>
                    <li><a href="/test-optional-string">/test-optional-string</a> - Test object with description (type.string.optional())</li>
                </ul>
                
                <h2>Schema Information</h2>
                <ul>
                    <li><a href="/schemas">/schemas</a> - View all validation schemas</li>
                    <li><a href="/test-data">/test-data</a> - View all test data objects</li>
                </ul>
                
                <h2>Test Results Summary</h2>
                <pre>
1. type.never.optional():
   - Allows omitting the field
   - Rejects when field is present with any value
   - Works with validateSerializedOutput for native BigInt

2. type.undefined.optional():
   - Allows omitting the field
   - Allows field with undefined value
   - Rejects when field has any other value

3. type.string.optional():
   - Allows omitting the field
   - Allows field with string value
   - Rejects when field has non-string value
                </pre>
            </body>
        </html>
    `)
})

// =====================================================================================================================
// MAIN FUNCTION
// =====================================================================================================================

async function main() {
    try {
        // Run validation tests first
        await run()
        console.log("\n=== TEST COMPLETE ===")
    } catch (err) {
        console.error("Error running tests:", err)
    }

    // Start the server regardless of test results
    console.log("\n=== STARTING SERVER ===")
    console.log("Open http://localhost:3000/docs to view the API documentation")

    Bun.serve({
        port: 3000,
        fetch: api.fetch,
    })

    console.log("Server running at http://localhost:3000")
}

await main()
