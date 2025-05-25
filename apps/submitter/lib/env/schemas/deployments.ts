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
     * This is required if the chain is not supported by default.
     *
     * If you use this for a supported chain, you might want to set {@link USE_WEBSOCKET} to false.
     */
    RPC_HTTP_URL: z.string().url().optional(),

    /**
     * The (WebScoket) RPC url to use for the chain. Defaults to a well-known RPC if {@link
     * CHAIN_ID} is known (for now only 31337 (devnet) and 216 (HappyChain Sepolia)).
     */
    RPC_WS_URL: z.string().url().optional(),

    /**
     * Set this to false to not use WebSocket. This is mostly useful when you use {@link RPC_HTTP_URL} in
     * conjunction with a supported chain and don't want the default WebSocket RPC to be used in priority.
     */
    USE_WEBSOCKET: z.coerce.boolean().optional().default(true),

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
