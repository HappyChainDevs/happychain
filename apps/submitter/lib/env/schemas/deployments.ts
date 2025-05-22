import { z } from "zod"
import { isHexString } from "#lib/utils/validation/isHexString"

/**
 * Schema for all the configuration options related to chains and contract addresses.
 */
export const deploymentsSchema = z.object({
    /**
     * ID of the chain the submitter operates on. If you need support
     * for multiple chains, run a separate submitter for every chain.
     */
    CHAIN_ID: z.coerce.number(),

    /**
     * When {@link CHAIN_ID}=216 (HappyChain Sepolia), whether to use the staging contracts or the prod prod contracts.
     */
    USE_STAGING_CONTRACTS: z
        .string()
        .default("false")
        .transform((str) => str !== "false" && str !== "0"),

    /**
     * The (HTTP) RPC url to use for the chain. Defaults to a well-known RPC if {@link
     * CHAIN_ID} is known (for now only 31337 (devnet) and 216 (HappyChain Sepolia)).
     *
     * TODO: websocket support
     */
    RPC_URL: z.string().url().optional(),

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
