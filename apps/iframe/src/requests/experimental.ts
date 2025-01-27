import { HappyMethodNames, PermissionNames, TransactionType } from "@happy.tech/common"
import { deployment as contractAddresses } from "@happy.tech/contracts/account-abstraction/sepolia"
import {
    EIP1193ErrorCodes,
    EIP1193UnauthorizedError,
    EIP1193UserRejectedRequestError,
    WalletType,
    getEIP1193ErrorObjectFromCode,
} from "@happy.tech/wallet-common"
import { decodeNonce } from "permissionless"
import {
    type Address,
    type Client,
    type Hash,
    type Hex,
    InvalidAddressError,
    type RpcTransactionRequest,
    type Transaction,
    type TransactionReceipt,
    hexToBigInt,
    isAddress,
    parseSignature,
} from "viem"
import { type UserOperation, entryPoint07Address, getUserOperationHash } from "viem/account-abstraction"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import {
    checkIsSessionKeyModuleInstalled,
    installSessionKeyModule,
    registerSessionKey,
} from "#src/requests/modules/session-keys/helpers"
import { type SessionKeysByHappyUser, StorageKey, storage } from "#src/services/storage.ts"
import { addPendingTx } from "#src/services/transactionHistory.ts"
import { getChains, getCurrentChain, setChains, setCurrentChain } from "#src/state/chains.ts"
import { loadAbiForUser } from "#src/state/loadedAbis.ts"
import {
    getAllPermissions,
    getPermissions,
    grantPermissions,
    hasPermissions,
    revokePermissions,
} from "#src/state/permissions.ts"
import { type ExtendedSmartAccountClient, getSmartAccountClient } from "#src/state/smartAccountClient.ts"
import type { PendingTxDetails } from "#src/state/txHistory.ts"
import { getUser } from "#src/state/user.ts"
import { addWatchedAsset } from "#src/state/watchedAssets.ts"
import type { AppURL } from "#src/utils/appURL.ts"
import { isAddChainParams } from "#src/utils/isAddChainParam.ts"
import { getNonce, parseUserOpCalldata, sendUserOp } from "./userOps"
import { checkAuthenticated } from "./utils"

interface HandleOptions {
    payload: { method: unknown; params: unknown }
    confirmed: boolean
    client: Client
    source: AppURL
}

export async function handle({ client, payload, confirmed, source }: HandleOptions) {
    const user = getUser()
    const isInjected = user?.type === WalletType.Injected

    switch (payload.method) {
        case "eth_chainId": {
            const currChain = getCurrentChain().chainId
            // @ts-ignore
            return currChain ?? (await client.request(payload))
        }

        case "eth_accounts": {
            // Social
            if (!isInjected) {
                const user = getUser()
                return user && hasPermissions(source, "eth_accounts") ? [user.address] : []
            }

            // Injected
            // @ts-ignore
            return await client.request(payload)
        }

        case "eth_requestAccounts": {
            // Injected Wallet
            if (isInjected) {
                // @ts-ignore
                const resp: unknown[] = await client.request(payload)
                if (resp?.length) {
                    // if successful, mirror response here.
                    grantPermissions(source, "eth_accounts")
                }
                return resp
            }

            // Social wallet
            if (!confirmed) {
                // This doesn't seem like the right error, copyied from permissionless
                if (!user || !hasPermissions(source, "eth_accounts")) throw new EIP1193UserRejectedRequestError()
                return [user.address]
            }

            // TODO: it should be impossible to confirm with no user present...
            if (!user) throw new EIP1193UserRejectedRequestError()
            grantPermissions(source, "eth_accounts")
            return [user.address]
        }

        case "eth_getTransactionByHash": {
            const [hash] = payload.params as [`0x${string}`]
            const smartAccountClient = (await getSmartAccountClient())!

            // Attempt to retrieve UserOperation details first.
            // Fall back to handling it as a regular transaction if the hash doesn't correspond to a userop.
            try {
                const userOpInfo = await smartAccountClient.getUserOperation({ hash })
                const { to, value } = parseUserOpCalldata(userOpInfo.userOperation.callData)
                const { v, r, s, yParity } = parseSignature(userOpInfo.userOperation.signature)

                return {
                    // Standard transaction fields
                    blockHash: userOpInfo.blockHash,
                    blockNumber: userOpInfo.blockNumber,
                    from: userOpInfo.userOperation.sender,
                    gas: userOpInfo.userOperation.callGasLimit,
                    maxFeePerGas: userOpInfo.userOperation.maxFeePerGas,
                    maxPriorityFeePerGas: userOpInfo.userOperation.maxPriorityFeePerGas,
                    nonce: Number(userOpInfo.userOperation.nonce),
                    to,
                    hash, // hash of the userop
                    value,
                    // Normally this is the tx index for regular transactions that have been
                    // included, but is allowed to be null for pending transactions. Since we don't
                    // get the userOp index, and returning the bundler tx index (1) wouldn't be
                    // meaningfully useful and (2) would require an extra call to try to get the
                    // userOp receipt, we always return null here.
                    // If truly required, use `eth_getTransactionReceipt`.
                    transactionIndex: null,
                    accessList: [],
                    type: "eip1559",
                    typeHex: TransactionType.EIP1559,
                    v: v!, // We're always under EIP-155
                    r,
                    s,
                    yParity,
                    chainId: Number(getCurrentChain().chainId),
                    // Weird non-standard Viem extension: "Contract code or a hashed method call"
                    // We just leave this empty.
                    input: "0x",
                    // Extra field for HappyWallet-aware users
                    userOp: userOpInfo.userOperation,
                } as Transaction // performs type-check, but allows extra fields
            } catch (_err) {
                // Fall back to handling it as a regular transaction if the hash doesn't correspond to a userop.
                // @ts-ignore
                return await client.request(payload)
            }
        }

        case "eth_getTransactionReceipt": {
            const [hash] = payload.params as [`0x${string}`]
            const smartAccountClient = (await getSmartAccountClient()) as ExtendedSmartAccountClient
            // Attempt to retrieve UserOperation details first.
            // Fall back to handling it as a regular transaction if the hash doesn't correspond to a userop.
            try {
                const [userOpReceipt, userOpInfo] = await Promise.all([
                    smartAccountClient.getUserOperationReceipt({ hash }),
                    smartAccountClient.getUserOperation({ hash }),
                ])
                const { to, value } = parseUserOpCalldata(userOpInfo.userOperation.callData)
                return {
                    // Standard transaction receipt fields
                    blockHash: userOpInfo.blockHash,
                    blockNumber: userOpInfo.blockNumber,
                    contractAddress: userOpReceipt.receipt.contractAddress,
                    cumulativeGasUsed: userOpReceipt.receipt.cumulativeGasUsed,
                    effectiveGasPrice: userOpReceipt.receipt.effectiveGasPrice,
                    from: userOpInfo.userOperation.sender,
                    gasUsed: userOpReceipt.receipt.gasUsed,
                    logs: userOpReceipt.receipt.logs,
                    logsBloom: userOpReceipt.receipt.logsBloom,
                    status: userOpReceipt.success ? "success" : "reverted",
                    to,
                    transactionHash: hash, // userop hash
                    transactionIndex: userOpReceipt.receipt.transactionIndex,
                    type: userOpReceipt.receipt.type,
                    userOpReceipt, // Extra field for HappyWallet-aware users
                    value, // Extra field because why not?
                } as TransactionReceipt // performs type-check, but allows extra fields
            } catch (_err) {
                // @ts-ignore
                return client.request(payload)
            }
        }

        case "eth_getTransactionCount": {
            const [address] = payload.params as [`0x${string}`]
            const smartAccountClient = (await getSmartAccountClient()) as ExtendedSmartAccountClient

            if (smartAccountClient && address.toLowerCase() === smartAccountClient.account.address.toLowerCase()) {
                /**
                 * For smart accounts, nonces combine :
                 * - A key (upper 192 bits) for custom wallet logic
                 * - A sequence number (lower 64 bits) for maintaining uniqueness
                 *
                 * @see {@link https://docs.stackup.sh/docs/useroperation-nonce} for detailed explanation
                 * @see {@link https://github.com/pimlicolabs/entrypoint-estimations/blob/main/lib/account-abstraction/contracts/interfaces/INonceManager.sol}
                 *
                 * `eth_getTransactionCount` should only return the sequence number to match
                 * traditional account behavior and maintain compatibility with existing tools.
                 */
                const fullNonce = await smartAccountClient.account.getNonce()
                const { sequence } = decodeNonce(fullNonce)
                return sequence
            }

            throw new InvalidAddressError({ address })
        }

        case "eth_estimateGas": {
            const [tx] = payload.params as [RpcTransactionRequest]
            const smartAccountClient = (await getSmartAccountClient()) as ExtendedSmartAccountClient
            const gasEstimation = await smartAccountClient.estimateUserOperationGas({
                calls: [
                    {
                        to: tx.to as `0x${string}`,
                        data: tx.data || "0x",
                        value: tx.value ? hexToBigInt(tx.value) : 0n,
                    },
                ],
            })

            return gasEstimation.callGasLimit
        }

        case "eth_sendTransaction": {
            if (!user) throw new EIP1193UnauthorizedError()

            if (isInjected) {
                // @ts-ignore
                const hash: Hash = await client.request(payload)
                // @ts-ignore
                const value = hexToBigInt(payload.params[0].value as Hex)
                const _payload: PendingTxDetails = { hash, value }
                addPendingTx(user.address, _payload)
                return hash
            }

            if (confirmed) {
                return await sendUserOp({
                    user,
                    // @ts-ignore
                    tx: payload.params[0],
                    signer: async (userOp, smartAccountClient) =>
                        await smartAccountClient.account.signUserOperation(userOp),
                })
            }

            // @ts-ignore
            const tx = payload.params[0]
            const target = tx.to
            if (!tx || !target) return false

            const permissions = getPermissions(source, {
                [PermissionNames.SESSION_KEY]: { target },
            })
            if (permissions.length === 0) throw new EIP1193UnauthorizedError()

            const sessionKey = storage.get(StorageKey.SessionKeys)?.[user.address]?.[target]
            if (!sessionKey) throw new EIP1193UnauthorizedError()

            return await sendUserOp({
                user,
                tx,
                signer: async (userOp, smartAccountClient) => {
                    const hash = getUserOperationHash({
                        userOperation: {
                            ...userOp,
                            sender: smartAccountClient.account.address,
                            signature: "0x",
                        } as UserOperation<"0.7">,
                        entryPointAddress: entryPoint07Address,
                        entryPointVersion: "0.7",
                        chainId: Number(getCurrentChain().chainId),
                    })

                    // @ts-ignore it must be a wallet client at this point
                    return await client.signMessage({
                        account: privateKeyToAccount(sessionKey),
                        message: { raw: hash },
                    })
                },
                nonceProvider: async (smartAccountClient) => {
                    return await getNonce(smartAccountClient.account.address, contractAddresses.SessionKeyValidator)
                },
            })
        }

        /*****************************************************************************************/
        /*************** HAPPY_ RPC METHODS */
        /******************************************************************** */

        case HappyMethodNames.USER: {
            if (isInjected) {
                if (!user) return undefined
                const acc = await client.request({ method: "eth_accounts" })
                return acc.length ? user : undefined
            }

            return user && hasPermissions(source, "eth_accounts") ? getUser() : undefined
        }

        case HappyMethodNames.USE_ABI: {
            if (!confirmed) return false
            // @ts-ignore
            return user ? loadAbiForUser(user.address, payload.params) : false
        }

        case HappyMethodNames.REQUEST_SESSION_KEY: {
            // TODO: fix rejection type
            if (!user) throw new Error("Failed to find user")

            if (confirmed) {
                // address of contract the session key will be authorized to interact with
                // @ts-ignore
                const targetContract = payload.params[0]

                if (!isAddress(targetContract)) {
                    throw new InvalidAddressError({ address: targetContract })
                }

                // Generate a new session key
                const sessionKey = generatePrivateKey()
                const accountSessionKey = privateKeyToAccount(sessionKey)

                // Check if we have any session keys stored for this account
                const storedSessionKeys = storage.get(StorageKey.SessionKeys) || {}
                const hasExistingSessionKeys = Boolean(storedSessionKeys[user!.address])

                const smartAccountClient = (await getSmartAccountClient())!
                let keyRegistered = false

                // Only check module installation if we don't have any session keys stored
                if (!hasExistingSessionKeys) {
                    const isSessionKeyValidatorInstalled = await checkIsSessionKeyModuleInstalled(smartAccountClient)
                    if (!isSessionKeyValidatorInstalled) {
                        await installSessionKeyModule(smartAccountClient, accountSessionKey.address, targetContract)
                        keyRegistered = true
                    }
                }

                // It's theoreticaly possible to have the validator uninstalled when there are local
                // session keys, but if you're doing that you're looking for trouble.

                if (!keyRegistered) {
                    const hash = await registerSessionKey(smartAccountClient, accountSessionKey.address, targetContract)
                    await smartAccountClient.waitForUserOperationReceipt({ hash })
                    keyRegistered = true
                }

                grantPermissions(source, { [PermissionNames.SESSION_KEY]: { target: targetContract } })

                storage.set(StorageKey.SessionKeys, {
                    ...storedSessionKeys,
                    [user!.address]: {
                        ...(storedSessionKeys[user!.address] || {}),
                        [targetContract]: sessionKey,
                    },
                })

                return accountSessionKey.address
            }

            // @ts-ignore
            const targetContractAddress = payload.params[0] as Address

            if (!isAddress(targetContractAddress)) {
                throw new InvalidAddressError({ address: targetContractAddress })
            }

            if (
                !hasPermissions(source, {
                    [PermissionNames.SESSION_KEY]: {
                        target: targetContractAddress,
                    },
                })
            ) {
                throw new EIP1193UnauthorizedError()
            }

            // Retrieve the stored session key for this user and target contract
            const storedSessionKeys = storage.get(StorageKey.SessionKeys) as SessionKeysByHappyUser
            const sessionKey = storedSessionKeys?.[user!.address]?.[targetContractAddress]

            if (!sessionKey) {
                throw new Error("Session key not found")
            }

            // Return the public address associated with this session key
            return privateKeyToAccount(sessionKey).address
        }

        /*****************************************************************************************/
        /*************** WALLET_ RPC METHODS */
        /******************************************************************** */

        case "wallet_watchAsset": {
            // @ts-ignore
            return user ? addWatchedAsset(user.address, payload.params) : false
        }

        case "wallet_addEthereumChain": {
            if (!user && !confirmed) return null
            const params = Array.isArray(payload.params) && payload.params[0]
            if (!isAddChainParams(params))
                throw getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.SwitchChainError, "Invalid request body")

            if (isInjected) {
                // @ts-ignore
                const resp = await client.request(payload)
                setChains((prev) => ({ ...prev, [params.chainId]: params }))
                await client.request({
                    method: "wallet_switchEthereumChain",
                    params: [{ chainId: params.chainId }],
                })
                setCurrentChain(params)
                return resp
            }

            // Social
            const chains = getChains()

            if (params.chainId in chains)
                throw getEIP1193ErrorObjectFromCode(EIP1193ErrorCodes.SwitchChainError, "Chain already exists")

            // @ts-ignore
            const response = await client.request(payload)
            setChains((prev) => ({ ...prev, [params.chainId]: params }))
            return response
        }

        case "wallet_switchEthereumChain": {
            if (!user && !confirmed) return null
            const chains = getChains()
            // @ts-ignore
            const chainId = payload.params[0].chainId
            if (chainId === getCurrentChain()?.chainId) return null // correct response for a successful request

            // ensure chain has already been added
            if (!(chainId in chains)) {
                throw getEIP1193ErrorObjectFromCode(
                    EIP1193ErrorCodes.SwitchChainError,
                    "Unrecognized chain ID, try adding the chain first.",
                )
            }

            // @ts-ignore
            const response = await client.request(payload)
            setCurrentChain(chains[chainId])
            return response
        }

        case "wallet_requestPermissions": {
            if (isInjected) {
                // @ts-ignore
                const resp: unknown[] = await client.request(payload)
                if (resp.length) grantPermissions(source, "eth_accounts")
                return resp
            }

            if (confirmed) {
                checkAuthenticated()
                // @ts-ignore
                const permissions = payload.params[0]
                return hasPermissions(source, permissions) ? getPermissions(source, permissions) : []
            }

            checkAuthenticated()
            // @ts-ignore
            const permissions = payload.params[0]
            return hasPermissions(source, permissions) ? getPermissions(source, permissions) : []
        }

        case "wallet_revokePermissions": {
            if (isInjected) {
                // @ts-ignore
                const resp = await client.request(payload)
                // @ts-ignore
                revokePermissions(source, payload.params[0])
                return resp
            }

            checkAuthenticated()
            // @ts-ignore
            revokePermissions(source, payload.params[0])
            return []
        }

        case "wallet_getPermissions": {
            return getAllPermissions(source)
        }

        default: {
            // @ts-ignore
            return await client.request(payload)
        }
    }
}
