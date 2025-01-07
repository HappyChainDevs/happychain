import type { Address, Hex } from "viem";

/**
 * @title HappyTx
 * @dev Represents a Happy Transaction - a transaction made by a Happy Smart Account
 * that can be submitted to the chain by a permissionless submitter.
 * The struct is arranged to optimize gas usage by ensuring efficient packing in storage.
 *
 * Core Transaction Fields:
 * @param account            - Account sending the transaction
 * @param gasLimit           - Gas limit for the transaction made by the submitter
 * @param executeGasLimit    - Gas limit for the IHappyAccount.execute function
 * @param dest               - Destination address for the transaction
 * @param paymaster          - Fee payer: This can be the
 *                                 1. account (if it implements IHappyPaymaster),
 *                                 2. external paymaster (implementing IHappyPaymaster),
 *                                 3. the submitter (an EOA, `tx.origin`)
 * @param value              - Amount of native tokens (in gas token wei) to transfer
 * @param callData           - Transaction calldata to be executed
 * @param nonce              - Account nonce, interpreted at the account's leisure
 *
 * Gas and Fee Parameters:
 * @param maxFeePerGas       - Maximum total fee per gas unit (inclusive basefee and priority fee)
 * @param submitterFee       - Flat fee in gas token wei for submitter (can be negative for rebates)
 *                               - Submitter asks for this on top of payment of gas. This can be used to pay
 *                                 for extra costs (e.g. DA costs on rollups, server costs), and for profit.
 *                               - Acts as rebate when negative (e.g. to refund part of the intrinsic transaction
 *                                 cost if the submitter batches multiple happyTxs together), but in no case does
 *                                 this lead to the submitter transferring funds to accounts.
 * @param paymasterData      - Extra data passed to the paymaster
 * @param validatorData      - Extra data for validation (e.g., signatures)
 * @param extraData          - Reserved for future extensions and custom implementations
 */
export interface HappyTx {
    account: Address;
    gasLimit: bigint;
    executeGasLimit: bigint;
    dest: Address;
    paymaster: Address;
    value: bigint;
    nonce: bigint;
    maxFeePerGas: bigint;
    submitterFee: bigint;
    callData: Hex;
    paymasterData: Hex;
    validatorData: Hex;
    extraData: Hex;
}

export interface SubmitHappyTxRequest {
    happyTx: HappyTx;
}
