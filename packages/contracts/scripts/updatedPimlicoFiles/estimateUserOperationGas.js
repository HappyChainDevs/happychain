import { parseAccount, } from '../../../accounts/utils/parseAccount.js';
import { AccountNotFoundError } from '../../../errors/account.js';
import { getAction } from '../../../utils/getAction.js';
import { serializeStateOverride } from '../../../utils/stateOverride.js';
import { getUserOperationError } from '../../utils/errors/getUserOperationError.js';
import { formatUserOperationGas, } from '../../utils/formatters/userOperationGas.js';
import { formatUserOperationRequest, } from '../../utils/formatters/userOperationRequest.js';
import { prepareUserOperation, } from './prepareUserOperation.js';
/**
 * Returns an estimate of gas values necessary to execute the User Operation.
 *
 * - Docs: https://viem.sh/actions/bundler/estimateUserOperationGas
 *
 * @param client - Client to use
 * @param parameters - {@link EstimateUserOperationGasParameters}
 * @returns The gas estimate (in wei). {@link EstimateUserOperationGasReturnType}
 *
 * @example
 * import { createBundlerClient, http, parseEther } from 'viem'
 * import { toSmartAccount } from 'viem/accounts'
 * import { mainnet } from 'viem/chains'
 * import { estimateUserOperationGas } from 'viem/actions'
 *
 * const account = await toSmartAccount({ ... })
 *
 * const bundlerClient = createBundlerClient({
 *   chain: mainnet,
 *   transport: http(),
 * })
 *
 * const values = await estimateUserOperationGas(bundlerClient, {
 *   account,
 *   calls: [{ to: '0x...', value: parseEther('1') }],
 * })
 */
export async function estimateUserOperationGas(client, parameters) {
    console.log("estimateUserOperationGas() .js");

    const startTime = Date.now();
    const timings = {
        start: startTime,
        parseAccountStart: 0,
        parseAccountEnd: 0,
        prepareUserOpStart: 0,
        prepareUserOpEnd: 0,
        rpcRequestStart: 0,
        rpcRequestEnd: 0,
        totalTime: 0,
    };

    const { account: account_ = client.account, entryPointAddress, stateOverride, } = parameters;

    // Benchmarking: Parse Account
    if (!account_ && !parameters.sender)
        throw new AccountNotFoundError();
    timings.parseAccountStart = Date.now() - startTime; // Start Benchmarking Parse Account
    const account = account_ ? parseAccount(account_) : undefined;
    timings.parseAccountEnd = Date.now() - timings.parseAccountStart - startTime;

    // Benchmarking: Prepare User Operation
    timings.prepareUserOpStart = Date.now() - startTime;
    const rpcStateOverride = serializeStateOverride(stateOverride);
    const request = account
        ? await getAction(client, prepareUserOperation, 'prepareUserOperation')({
            ...parameters,
            parameters: ['factory', 'nonce', 'paymaster', 'signature'],
        })
        : parameters;
    timings.prepareUserOpEnd = Date.now() - timings.prepareUserOpStart - startTime; // End Benchmarking Prepare User Operation

    try {
        // Benchmarking: RPC Request
        timings.rpcRequestStart = Date.now() - startTime;
        const params = [
            formatUserOperationRequest(request),
            (entryPointAddress ?? account?.entryPoint?.address),
        ];
        const result = await client.request({
            method: 'eth_estimateUserOperationGas',
            params: rpcStateOverride ? [...params, rpcStateOverride] : [...params],
        });

        timings.rpcRequestEnd = Date.now() - timings.rpcRequestStart - startTime; // End Benchmarking RPC Request
        timings.totalTime = Date.now() - timings.rpcRequestEnd - startTime;

        console.log("estimateUserOperationGas Benchmark Results:", timings);
        return formatUserOperationGas(result);
    }
    catch (error) {
        const calls = parameters.calls;
        throw getUserOperationError(error, {
            ...request,
            ...(calls ? { calls } : {}),
        });
    }
}
//# sourceMappingURL=estimateUserOperationGas.js.map