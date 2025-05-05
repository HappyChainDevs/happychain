import { z } from "zod"

const ethAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address")

const externalLibrarySchema = z.object({
    name: z.string(),
    address_hash: ethAddress,
})

const additionalSourceSchema = z.object({
    file_path: z.string(),
    source_code: z.string(),
})

const compilerSettingsSchema = z.object({
    compilationTarget: z.record(z.string(), z.string()).optional(),
    evmVersion: z.string().optional(),
    libraries: z.record(z.string(), z.string()).optional(),
    metadata: z
        .object({
            bytecodeHash: z.string(),
            appendCBOR: z.boolean().optional(),
            useLiteralContent: z.boolean().optional(),
        })
        .optional(),
    optimizer: z
        .object({
            enabled: z.boolean(),
            runs: z.number(),
        })
        .optional(),
    outputSelection: z.record(z.string(), z.unknown()).optional(),
    remappings: z.array(z.string()).optional(),
    viaIR: z.boolean().optional(),
})

const decodedConstructorArgSchema = z.tuple([
    z.unknown(), // relaxed because sometimes this isn't an address
    z.object({
        internalType: z.string(),
        name: z.string(),
        type: z.string(),
    }),
])

export const contractMetadataSchema = z.object({
    verified_twin_address_hash: ethAddress.nullable().optional(),
    is_verified: z.boolean(),
    is_changed_bytecode: z.boolean(),
    is_partially_verified: z.boolean(),
    is_fully_verified: z.boolean(),
    is_verified_via_sourcify: z.boolean(),
    is_verified_via_eth_bytecode_db: z.boolean(),
    is_self_destructed: z.boolean(),
    can_be_visualized_via_sol2uml: z.boolean(),
    minimal_proxy_address_hash: ethAddress.nullable().optional(),
    sourcify_repo_url: z.string().url().nullable().optional(),
    name: z.string(),
    optimization_enabled: z.boolean(),
    optimizations_runs: z.number().optional(),
    compiler_version: z.string(),
    evm_version: z.string(),
    verified_at: z.string().datetime(),
    abi: z.union([z.string(), z.array(z.unknown())]),
    source_code: z.string(),
    file_path: z.string(),
    compiler_settings: compilerSettingsSchema.optional(),
    constructor_args: z
        .string()
        .regex(/^0x[a-fA-F0-9]*$/)
        .nullable()
        .optional(),
    decoded_constructor_args: z.array(decodedConstructorArgSchema).nullable().optional(),
    deployed_bytecode: z
        .string()
        .regex(/^0x[a-fA-F0-9]*$/)
        .optional(),
    creation_bytecode: z
        .string()
        .regex(/^0x[a-fA-F0-9]*$/)
        .optional(),
    external_libraries: z.array(externalLibrarySchema).optional(),
    language: z.string().optional(),
    status: z.string().optional(),
    additional_sources: z.array(additionalSourceSchema).optional(),
    license_type: z.string().optional(),
    proxy_type: z.string().nullable().optional(),
    implementations: z
        .array(
            z.union([
                z.string(), // legacy or simplified form
                z.object({
                    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
                    name: z.string(),
                }),
            ]),
        )
        .optional(),

    is_verified_via_verifier_alliance: z.boolean().optional(),
    has_methods_read: z.boolean().optional(),
    has_methods_write: z.boolean().optional(),
    has_methods_read_proxy: z.boolean().optional(),
    has_methods_write_proxy: z.boolean().optional(),
    is_blueprint: z.boolean().optional(),
    is_vyper_contract: z.boolean().optional(),
    certified: z.boolean().optional(),
})
