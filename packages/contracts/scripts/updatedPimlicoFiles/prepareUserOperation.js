import { parseAccount, } from '../../../accounts/utils/parseAccount.js';
import { estimateFeesPerGas, } from '../../../actions/public/estimateFeesPerGas.js';
import { getChainId as getChainId_ } from '../../../actions/public/getChainId.js';
import { AccountNotFoundError } from '../../../errors/account.js';
import { encodeFunctionData, } from '../../../utils/abi/encodeFunctionData.js';
import { concat } from '../../../utils/data/concat.js';
import { getAction } from '../../../utils/getAction.js';
import { parseGwei } from '../../../utils/unit/parseGwei.js';
import { getPaymasterData as getPaymasterData_, } from '../paymaster/getPaymasterData.js';
import { getPaymasterStubData as getPaymasterStubData_, } from '../paymaster/getPaymasterStubData.js';
import { estimateUserOperationGas, } from './estimateUserOperationGas.js';
const defaultParameters = [
    'factory',
    'fees',
    'gas',
    'paymaster',
    'nonce',
    'signature',
];
/**
 * Prepares a User Operation and fills in missing properties.
 *
 * - Docs: https://viem.sh/actions/bundler/prepareUserOperation
 *
 * @param args - {@link PrepareUserOperationParameters}
 * @returns The User Operation. {@link PrepareUserOperationReturnType}
 *
 * @example
 * import { createBundlerClient, http } from 'viem'
 * import { toSmartAccount } from 'viem/accounts'
 * import { mainnet } from 'viem/chains'
 * import { prepareUserOperation } from 'viem/actions'
 *
 * const account = await toSmartAccount({ ... })
 *
 * const client = createBundlerClient({
 *   chain: mainnet,
 *   transport: http(),
 * })
 *
 * const request = await prepareUserOperation(client, {
 *   account,
 *   calls: [{ to: '0x...', value: parseEther('1') }],
 * })
 */

export async function prepareUserOperation(client, parameters_) {
    console.log("prepareUserOperation() .js");
    const startTime = Date.now();
    const timings = {
        start: startTime,
        parseAccount: 0,
        paymasterSetup: 0,
        encodeCalls: 0,
        factory: 0,
        fees: 0,
        nonce: 0,
        signature: 0,
        gasEstimation: 0,
        getPaymasterData: 0,
        totalTime: 0,
    };
    const parameters = parameters_;
    const { account: account_ = client.account, parameters: properties = defaultParameters, stateOverride, } = parameters;
    ////////////////////////////////////////////////////////////////////////////////
    // Assert that an Account is defined.
    ////////////////////////////////////////////////////////////////////////////////
    const parseAccountStart = Date.now();

    if (!account_)
        throw new AccountNotFoundError();
    const account = parseAccount(account_);

    timings.parseAccount = Date.now() - parseAccountStart;

    ////////////////////////////////////////////////////////////////////////////////
    // Declare typed Bundler Client.
    ////////////////////////////////////////////////////////////////////////////////
    const bundlerClient = client;
    ////////////////////////////////////////////////////////////////////////////////
    // Declare Paymaster properties.
    ////////////////////////////////////////////////////////////////////////////////

    const paymasterSetupStart = Date.now();

    const paymaster = parameters.paymaster ?? bundlerClient?.paymaster;
    const paymasterAddress = typeof paymaster === 'string' ? paymaster : undefined;
    const { getPaymasterStubData, getPaymasterData } = (() => {
        // If `paymaster: true`, we will assume the Bundler Client supports Paymaster Actions.
        if (paymaster === true)
            return {
                getPaymasterStubData: (parameters) => getAction(bundlerClient, getPaymasterStubData_, 'getPaymasterStubData')(parameters),
                getPaymasterData: (parameters) => getAction(bundlerClient, getPaymasterData_, 'getPaymasterData')(parameters),
            };
        // If Actions are passed to `paymaster` (via Paymaster Client or directly), we will use them.
        if (typeof paymaster === 'object') {
            const { getPaymasterStubData, getPaymasterData } = paymaster;
            return {
                getPaymasterStubData: (getPaymasterData && getPaymasterStubData
                    ? getPaymasterStubData
                    : getPaymasterData),
                getPaymasterData: getPaymasterData && getPaymasterStubData
                    ? getPaymasterData
                    : undefined,
            };
        }
        // No Paymaster functions.
        return {
            getPaymasterStubData: undefined,
            getPaymasterData: undefined,
        };
    })();
    const paymasterContext = parameters.paymasterContext
        ? parameters.paymasterContext
        : bundlerClient?.paymasterContext;

    timings.paymasterSetup = Date.now() - paymasterSetupStart;

    ////////////////////////////////////////////////////////////////////////////////
    // Set up the User Operation request.
    ////////////////////////////////////////////////////////////////////////////////
    let request = {
        ...parameters,
        paymaster: paymasterAddress,
        sender: account.address,
    };
    ////////////////////////////////////////////////////////////////////////////////
    // Concurrently prepare properties required to fill the User Operation.
    ////////////////////////////////////////////////////////////////////////////////
    const [callData, factory, fees, nonce, signature] = await Promise.all([
        (async () => {
            const encodeCallsStart = Date.now();
            if (parameters.calls)
                return account.encodeCalls(parameters.calls.map((call_) => {
                    const call = call_;
                    if ('abi' in call)
                        return {
                            data: encodeFunctionData(call),
                            to: call.to,
                            value: call.value,
                        };
                    return call;
                }));
            timings.encodeCalls = Date.now() - encodeCallsStart
            return parameters.callData;
        })(),
        (async () => {
            const factoryStart = Date.now();
            if (!properties.includes('factory'))
                return undefined;
            if (parameters.initCode)
                return { initCode: parameters.initCode };
            if (parameters.factory && parameters.factoryData) {
                timings.factory = Date.now() - factoryStart;
                return {
                    factory: parameters.factory,
                    factoryData: parameters.factoryData,
                };
            }
            const { factory, factoryData } = await account.getFactoryArgs();
            if (account.entryPoint.version === '0.6')
                return {
                    initCode: factory && factoryData ? concat([factory, factoryData]) : undefined,
                };

            timings.factory = Date.now() - factoryStart;
            return {
                factory,
                factoryData,
            };
        })(),
        (async () => {
            const feesStart = Date.now();

            if (!properties.includes('fees'))
                return undefined;
            // If we have sufficient properties for fees, return them.
            if (typeof parameters.maxFeePerGas === 'bigint' &&
                typeof parameters.maxPriorityFeePerGas === 'bigint')
                return request;
            // If the Bundler Client has a `estimateFeesPerGas` hook, run it.
            if (bundlerClient?.userOperation?.estimateFeesPerGas) {
                const fees = await bundlerClient.userOperation.estimateFeesPerGas({
                    account,
                    bundlerClient,
                    userOperation: request,
                });

                timings.fees = Date.now() - feesStart;

                return {
                    ...request,
                    ...fees,
                };
            }
            // Otherwise, we will need to estimate the fees to fill the fee properties.
            try {
                const client_ = bundlerClient.client ?? client;
                const fees = await getAction(client_, estimateFeesPerGas, 'estimateFeesPerGas')({
                    chain: client_.chain,
                    type: 'eip1559',
                });

                timings.fees = Date.now() - feesStart;

                return {
                    maxFeePerGas: typeof parameters.maxFeePerGas === 'bigint'
                        ? parameters.maxFeePerGas
                        : BigInt(
                            // Bundlers unfortunately have strict rules on fee prechecks – we will need to set a generous buffer.
                            Math.max(Number(2n * fees.maxFeePerGas), Number(parseGwei('3')))),
                    maxPriorityFeePerGas: typeof parameters.maxPriorityFeePerGas === 'bigint'
                        ? parameters.maxPriorityFeePerGas
                        : BigInt(
                            // Bundlers unfortunately have strict rules on fee prechecks – we will need to set a generous buffer.
                            Math.max(Number(2n * fees.maxPriorityFeePerGas), Number(parseGwei('1')))),
                };
            }
            catch {
                return undefined;
            }
        })(),
        (async () => {
            const nonceStart = Date.now();

            if (!properties.includes('nonce'))
                return undefined;
            if (typeof parameters.nonce === 'bigint')
                return parameters.nonce;

            timings.nonce = Date.now() - nonceStart;

            return account.getNonce();
        })(),
        (async () => {
            const signatureStart = Date.now();

            if (!properties.includes('signature'))
                return undefined;
            if (typeof parameters.signature !== 'undefined')
                return parameters.signature;

            timings.signature = Date.now() - signatureStart;

            return account.getStubSignature();
        })(),
    ]);
    ////////////////////////////////////////////////////////////////////////////////
    // Fill User Operation with the prepared properties from above.
    ////////////////////////////////////////////////////////////////////////////////
    if (typeof callData !== 'undefined')
        request.callData = callData;
    if (typeof factory !== 'undefined')
        request = { ...request, ...factory };
    if (typeof fees !== 'undefined')
        request = { ...request, ...fees };
    if (typeof nonce !== 'undefined')
        request.nonce = nonce;
    if (typeof signature !== 'undefined')
        request.signature = signature;
    ////////////////////////////////////////////////////////////////////////////////
    // `initCode` is required to be filled with EntryPoint 0.6.
    ////////////////////////////////////////////////////////////////////////////////
    // If no `initCode` is provided, we use an empty bytes string.
    if (account.entryPoint.version === '0.6' && !request.initCode)
        request.initCode = '0x';
    ////////////////////////////////////////////////////////////////////////////////
    // Fill User Operation with paymaster-related properties for **gas estimation**.
    ////////////////////////////////////////////////////////////////////////////////
    let chainId;
    async function getChainId() {
        if (chainId)
            return chainId;
        if (client.chain)
            return client.chain.id;
        const chainId_ = await getAction(client, getChainId_, 'getChainId')({});
        chainId = chainId_;
        return chainId;
    }
    // If the User Operation is intended to be sponsored, we will need to fill the paymaster-related
    // User Operation properties required to estimate the User Operation gas.
    let isPaymasterPopulated = false;
    if (properties.includes('paymaster') &&
        getPaymasterStubData &&
        !paymasterAddress &&
        !parameters.paymasterAndData) {
        const { isFinal = false, sponsor, ...paymasterArgs } = await getPaymasterStubData({
            chainId: await getChainId(),
            entryPointAddress: account.entryPoint.address,
            context: paymasterContext,
            ...request,
        });
        isPaymasterPopulated = isFinal;
        request = {
            ...request,
            ...paymasterArgs,
        };
    }
    ////////////////////////////////////////////////////////////////////////////////
    // `paymasterAndData` is required to be filled with EntryPoint 0.6.
    ////////////////////////////////////////////////////////////////////////////////
    // If no `paymasterAndData` is provided, we use an empty bytes string.
    if (account.entryPoint.version === '0.6' && !request.paymasterAndData)
        request.paymasterAndData = '0x';
    ////////////////////////////////////////////////////////////////////////////////
    // Fill User Operation with gas-related properties.
    ////////////////////////////////////////////////////////////////////////////////
    if (properties.includes('gas')) {
        const gasEstimationStart = Date.now();

        // If the Account has opinionated gas estimation logic, run the `estimateGas` hook and
        // fill the request with the prepared gas properties.
        if (account.userOperation?.estimateGas) {
            const gas = await account.userOperation.estimateGas(request);
            request = {
                ...request,
                ...gas,
            };
            timings.gasEstimation = Date.now() - gasEstimationStart;
        }
        // If not all the gas properties are already populated, we will need to estimate the gas
        // to fill the gas properties.
        if (typeof request.callGasLimit === 'undefined' ||
            typeof request.preVerificationGas === 'undefined' ||
            typeof request.verificationGasLimit === 'undefined' ||
            (request.paymaster &&
                typeof request.paymasterPostOpGasLimit === 'undefined') ||
            (request.paymaster &&
                typeof request.paymasterVerificationGasLimit === 'undefined')) {
            console.log("Calling estimateUserOperationGas");
            const gas = await getAction(bundlerClient, estimateUserOperationGas, 'estimateUserOperationGas')({
                account,
                // Some Bundlers fail if nullish gas values are provided for gas estimation :') –
                // so we will need to set a default zeroish value.
                callGasLimit: 0n,
                preVerificationGas: 0n,
                verificationGasLimit: 0n,
                stateOverride,
                ...(request.paymaster
                    ? {
                        paymasterPostOpGasLimit: 0n,
                        paymasterVerificationGasLimit: 0n,
                    }
                    : {}),
                ...request,
            });
            request = {
                ...request,
                callGasLimit: request.callGasLimit ?? gas.callGasLimit,
                preVerificationGas: request.preVerificationGas ?? gas.preVerificationGas,
                verificationGasLimit: request.verificationGasLimit ?? gas.verificationGasLimit,
                paymasterPostOpGasLimit: request.paymasterPostOpGasLimit ?? gas.paymasterPostOpGasLimit,
                paymasterVerificationGasLimit: request.paymasterVerificationGasLimit ??
                    gas.paymasterVerificationGasLimit,
            };
            timings.gasEstimation = Date.now() - gasEstimationStart;
        }
    }
    ////////////////////////////////////////////////////////////////////////////////
    // Fill User Operation with paymaster-related properties for **sending** the User Operation.
    ////////////////////////////////////////////////////////////////////////////////
    // If the User Operation is intended to be sponsored, we will need to fill the paymaster-related
    // User Operation properties required to send the User Operation.
    if (properties.includes('paymaster') &&
        getPaymasterData &&
        !paymasterAddress &&
        !parameters.paymasterAndData &&
        !isPaymasterPopulated) {
        // Retrieve paymaster-related User Operation properties to be used for **sending** the User Operation.
        const getPaymasterDataStart = Date.now();
        const paymaster = await getPaymasterData({
            chainId: await getChainId(),
            entryPointAddress: account.entryPoint.address,
            context: paymasterContext,
            ...request,
        });
        request = {
            ...request,
            ...paymaster,
        };

        timings.getPaymasterData = Date.now() - getPaymasterDataStart;
    }
    ////////////////////////////////////////////////////////////////////////////////
    // Remove redundant properties that do not conform to the User Operation schema.
    ////////////////////////////////////////////////////////////////////////////////
    delete request.calls;
    delete request.parameters;
    delete request.paymasterContext;
    if (typeof request.paymaster !== 'string')
        delete request.paymaster;
    ////////////////////////////////////////////////////////////////////////////////

    timings.totalTime = Date.now() - startTime;
    console.log("prepareUserOperation Sender: ", request.sender)
    console.log("prepareUserOperation Benchmark Results:", timings);

    return request;
}
//# sourceMappingURL=prepareUserOperation.js.map
