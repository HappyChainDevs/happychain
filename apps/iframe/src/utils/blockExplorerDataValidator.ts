import { z } from "zod"

/**
 * cf: https://explorer.testnet.happy.tech/api-docs
 * (search for -- /smart-contracts/{address_hash} --)
 */

const ethAddress = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid address")

export const externalLibrarySchema = z.object({
    name: z.string(),
    address_hash: ethAddress,
})

export const additionalSourceSchema = z.object({
    file_path: z.string(),
    source_code: z.string(),
})

export const compilerSettingsSchema = z.object({
    compilationTarget: z.record(z.string(), z.string()).optional(),
    evmVersion: z.string().optional(),
    libraries: z.record(z.string(), z.string()).optional(),
    metadata: z
        .object({
            bytecodeHash: z.string(),
        })
        .optional(),
    optimizer: z
        .object({
            enabled: z.boolean(),
            runs: z.number(),
        })
        .optional(),
    remappings: z.array(z.string()).optional(),
})

export const decodedConstructorArgSchema = z.tuple([
    ethAddress,
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
        .optional(),
    decoded_constructor_args: z.array(decodedConstructorArgSchema).optional(),
    deployed_bytecode: z
        .string()
        .regex(/^0x[a-fA-F0-9]*$/)
        .optional(),
    creation_bytecode: z
        .string()
        .regex(/^0x[a-fA-F0-9]*$/)
        .optional(),
    external_libraries: z.array(externalLibrarySchema).optional(),
    language: z.string().optional(), // fallback if invalid enum
    status: z.string().optional(), // fallback if invalid enum
    additional_sources: z.array(additionalSourceSchema).optional(),
})
