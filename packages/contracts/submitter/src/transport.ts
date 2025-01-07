import type {HttpTransport, HttpTransportConfig, Hex} from "viem";
import {
    RpcRequestError,
    UrlRequiredError,
    createTransport,
    toFunctionSelector,
    getAbiItem,
    isHex,
    slice,
} from "viem";
import { formatAbiItem, rpc } from "viem/utils";
import type { Logger } from "./logger";

// TODO: Import actual ABI from contracts package
const HappyEntrypointAbi = [
    "event ExecutionResult(bool success, bytes result)",
    "event ValidationResult(bool success, bytes result)",
    "event FailedOp(address indexed account, string reason)",
    "function handleOps(tuple(address account, uint32 gasLimit, uint32 executeGasLimit, address dest, address paymaster, uint256 value, uint256 nonce, uint256 maxFeePerGas, int256 submitterFee, bytes callData, bytes paymasterData, bytes validatorData, bytes extraData)[] ops) external"
] as const;

const EXECUTION_RESULT_SELECTOR = toFunctionSelector(
    formatAbiItem(
        getAbiItem({
            abi: HappyEntrypointAbi,
            name: "ExecutionResult"
        })
    )
);

const VALIDATION_RESULT_SELECTOR = toFunctionSelector(
    formatAbiItem(
        getAbiItem({
            abi: HappyEntrypointAbi,
            name: "ValidationResult"
        })
    )
);

const FAILED_OP_SELECTOR = toFunctionSelector(
    formatAbiItem(
        getAbiItem({
            abi: HappyEntrypointAbi,
            name: "FailedOp"
        })
    )
);

export type RpcRequest = {
    jsonrpc?: "2.0" | undefined;
    method: string;
    params?: any | undefined;
    id?: number | undefined;
};

export function createCustomTransport(
    /** URL of the JSON-RPC API. Defaults to the chain's public RPC URL. */
    url_: string,
    config: HttpTransportConfig & { logger: Logger }
): HttpTransport {
    const {
        fetchOptions,
        key = "http",
        name = "HTTP JSON-RPC",
        retryDelay,
        logger
    } = config;

    return ({ chain, retryCount: retryCount_, timeout: timeout_ }) => {
        const retryCount = config.retryCount ?? retryCount_;
        const timeout = timeout_ ?? config.timeout ?? 10_000;
        const url = url_ || chain?.rpcUrls.default.http[0];
        if (!url) {
            throw new UrlRequiredError();
        }

        return createTransport(
            {
                key,
                name,
                async request({ method, params }) {
                    const body = { method, params };
                    const fn = async (body: RpcRequest) => {
                        return [
                            await rpc.http(url, {
                                body,
                                fetchOptions,
                                timeout
                            })
                        ];
                    };

                    const [{ error, result }] = await fn(body);
                    if (error) {
                        let loggerFn = logger.error.bind(logger);

                        if (isHex(error?.data) && error?.data?.length > 10) {
                            const errorSelector = slice(error?.data, 0, 4);

                            if (
                                [
                                    EXECUTION_RESULT_SELECTOR,
                                    VALIDATION_RESULT_SELECTOR,
                                    FAILED_OP_SELECTOR
                                ].includes(errorSelector as Hex)
                            ) {
                                loggerFn = logger.info.bind(logger);
                            }
                        }

                        loggerFn(
                            {
                                err: error,
                                body
                            },
                            "received error response"
                        );

                        throw new RpcRequestError({
                            body,
                            error: {
                                ...error,
                                code:
                                    method === "eth_call" &&
                                    error.code === -32003
                                        ? 3
                                        : error.code
                            },
                            url: url
                        });
                    }
                    logger.info({ body, result }, "received response");
                    return result;
                },
                retryCount,
                retryDelay,
                timeout,
                type: "http"
            },
            {
                fetchOptions,
                url
            }
        );
    };
}
