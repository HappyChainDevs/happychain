import { parseAccount } from '../../../accounts/utils/parseAccount.js';
import { AccountNotFoundError } from '../../../errors/account.js';
import { getAction } from '../../../utils/getAction.js';
import { getUserOperationError } from '../../utils/errors/getUserOperationError.js';
import { formatUserOperationRequest, } from '../../utils/formatters/userOperationRequest.js';
import { prepareUserOperation, } from './prepareUserOperation.js';
/**
 * Broadcasts a User Operation to the Bundler.
 *
 * - Docs: https://viem.sh/actions/bundler/sendUserOperation
 *
 * @param client - Client to use
 * @param parameters - {@link SendUserOperationParameters}
 * @returns The User Operation hash. {@link SendUserOperationReturnType}
 *
 * @example
 * import { createBundlerClient, http, parseEther } from 'viem'
 * import { mainnet } from 'viem/chains'
 * import { toSmartAccount } from 'viem/accounts'
 * import { sendUserOperation } from 'viem/actions'
 *
 * const account = await toSmartAccount({ ... })
 *
 * const bundlerClient = createBundlerClient({
 *   chain: mainnet,
 *   transport: http(),
 * })
 *
 * const values = await sendUserOperation(bundlerClient, {
 *   account,
 *   calls: [{ to: '0x...', value: parseEther('1') }],
 * })
 */
export async function sendUserOperation(client, parameters) {
    const startTime = Date.now();
    const timings = {
        start: startTime,
        parseAccountStart: 0,
        parseAccountEnd: 0,
        prepareUserOperationStart: 0,
        prepareUserOperationEnd: 0,
        signUserOperationStart: 0,
        signUserOperationEnd: 0,
        formatRequestStart: 0,
        formatRequestEnd: 0,
        rpcRequestStart: 0,
        rpcRequestEnd: 0,
        totalTime: 0,
    };

    console.log('sendUserOperation() .js');
    const { account: account_ = client.account, entryPointAddress } = parameters;
    if (!account_ && !parameters.sender)
        throw new AccountNotFoundError();

    // Step 1: Parse account, if available
    timings.parseAccountStart = Date.now() - startTime;
    const account = account_ ? parseAccount(account_) : undefined;
    timings.parseAccountEnd = Date.now() - timings.parseAccountStart - startTime;

    // console.log("Calling prepareUserOperation");

    // Step 2: Prepare user operation request
    timings.prepareUserOperationStart = Date.now() - startTime;
    const request = account
        ? await getAction(client, prepareUserOperation, 'prepareUserOperation')(parameters)
        : parameters;
    timings.prepareUserOperationEnd = Date.now() - timings.prepareUserOperationStart - startTime;

    // Step 3: Sign the user operation, if required
    timings.signUserOperationStart = Date.now() - startTime;
    const signature = (parameters.signature ||
        (await account?.signUserOperation(request)));
    timings.signUserOperationEnd = Date.now() - timings.signUserOperationStart - startTime;

    // Step 4: Format the request for RPC submission
    timings.formatRequestStart = Date.now() - startTime;
    const rpcParameters = formatUserOperationRequest({
        ...request,
        signature,
    });
    timings.formatRequestEnd = Date.now() - timings.formatRequestEnd - startTime;

    // Step 5: Send the user operation via RPC
    try {
        timings.rpcRequestStart = Date.now() - startTime;
        return await client.request({
            method: 'eth_sendUserOperation',
            params: [
                rpcParameters,
                (entryPointAddress ?? account?.entryPoint.address),
            ],
        }, { retryCount: 0 });
        timings.rpcRequestEnd = Date.now() - timings.rpcRequestStart - startTime;
        timings.totalTime = Date.now() - startTime;

        console.log("sendUserOp Benchmarking Results:", timings);
    }
    catch (error) {
        const calls = parameters.calls;
        throw getUserOperationError(error, {
            ...request,
            ...(calls ? { calls } : {}),
            signature,
        });
    }
}
//# sourceMappingURL=sendUserOperation.js.map