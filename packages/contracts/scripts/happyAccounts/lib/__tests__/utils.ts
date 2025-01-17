import { expect } from "vitest";
import type { HappyTx } from "../../types/happyTx";

// Helper function to compare HappyTx objects
export function assertHappyTxEqual(actual: HappyTx, expected: HappyTx) {
    const fields: (keyof HappyTx)[] = [
        'account',
        'gasLimit',
        'executeGasLimit',
        'dest',
        'paymaster',
        'value',
        'nonce',
        'maxFeePerGas',
        'submitterFee',
        'callData',
        'paymasterData',
        'validatorData',
        'extraData'
    ];

    fields.forEach(field => {
        expect(actual[field], `Field ${field} should match`).toBe(expected[field]);
    });
}