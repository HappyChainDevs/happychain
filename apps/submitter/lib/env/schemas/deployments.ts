import { z } from "zod"
import { isHexString } from "#lib/utils/validation/helpers"

/**
 * Schema for all the configuration options related to chains and contract addresses.
 */
export const deploymentsSchema = z.object({
    /**
     * ID of the chain the submitter operates on. If you need support
     * for multiple chains, run a separate submitter for every chain.
     */
    CHAIN_ID: z.coerce.number().nonnegative(),

    /**
     * When {@link CHAIN_ID}=216 (HappyChain Sepolia), whether to use the staging contracts or the prod prod contracts.
     */
    USE_STAGING_CONTRACTS: z
        .string()
        .default("false")
        .transform((str) => str !== "false" && str !== "0"),

    /**
     * Optional comma-separated list of RPC URLS in order of priority. HTTP and WebSock URLS can be mixed.
     * This is required if the chain is not supported by default (HappyChain Sepolia or Anvil devnet).
     *
     * Defaults to well-known RPCs if {@link CHAIN_ID} is known (devnet = 31337 or HappyChainSepolia = 216).
     */
    RPC_URLS: z
        .string()
        .optional()
        .transform((url) => {
            if (!url) return undefined
            return z.array(z.string().url()).parse(
                url
                    .split(",")
                    .map((a) => a.trim())
                    .filter(Boolean),
            ) as readonly string[]
        }),

    /**
     * The address of the EntryPoint contract to submit boops to.
     * Defaults to the latest stable EntryPoint release from Happy Devs.
     *
     * Note that for now, this contract have an ABI compatible to the default contract, or the submitter won't work.
     */
    DEPLOYMENT_ENTRYPOINT: z.string().refine(isHexString).optional(),

    /**
     * The address of the AccountFactory contract used to deploy Boop
     * accounts. Defaults to the latest stable HappyAccountBeaconProxyFactory release from Happy Devs.
     *
     * Note that this will change to HappyAccountUUPSProxyFactory in the future. The beacon factory is **NOT** safe
     * to use in production, as it can be upgraded by a third-party to the account owner.
     *
     * Note that for now, this contract have an ABI compatible to the default contract, or the submitter won't work.
     */
    DEPLOYMENT_ACCOUNT_FACTORY: z.string().refine(isHexString).optional(),

    /**
     * The account implementation deployed by the {@link DEPLOYMENT_ACCOUNT_FACTORY}.
     * Defaults to the latest stable HappyAccount release from Happy Devs.
     *
     * Note that for now, this contract have an ABI compatible to the default contract, or the submitter won't work.
     */
    DEPLOYMENT_ACCOUNT_IMPLEMENTATION: z.string().refine(isHexString).optional(),
})
