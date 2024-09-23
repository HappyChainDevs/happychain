import type { Address, Client } from "viem"
import { concatHex, maxUint16, pad, toHex } from "viem"
import { entryPoint07Address } from "viem/account-abstraction"

import { getAccountNonce } from "permissionless/actions"

enum VALIDATOR_TYPE {
    ROOT = "0x00",
    VALIDATOR = "0x01",
    PERMISSION = "0x02",
}

enum VALIDATOR_MODE {
    DEFAULT = "0x00",
    ENABLE = "0x01",
}

/**
 * Fetches the custom nonce for a given smart account kernel and validator.
 *
 * @param client          The client used to interact with the blockchain.
 * @param kernel          The address of the Kernel smart account.
 * @param validator       The address of the validator associated with the Kernel.
 * @param kernelNonceKey  Internal key to the Kernel smart account. It is unused for the root
 *                        validator module and should not be confused with the ERC-4337 nonce key.
 * @param validatorMode   The mode in which the validator operates (default is DEFAULT).
 * @param validatorType   The type of validator (default is VALIDATOR).
 */
export async function getCustomNonce(
    client: Client,
    kernel: Address,
    validator: Address,
    kernelNonceKey = 0n,
    validatorMode: VALIDATOR_MODE = VALIDATOR_MODE.DEFAULT,
    validatorType: VALIDATOR_TYPE = VALIDATOR_TYPE.VALIDATOR,
) {
    if (kernelNonceKey > maxUint16) {
        throw new Error("nonce key must be equal or less than 2 bytes(maxUint16) for Kernel V3.1")
    }

    const encoding = pad(
        concatHex([
            validatorMode, // 1 byte
            validatorType, // 1 byte
            validator, // 20 bytes
            toHex(kernelNonceKey, { size: 2 }),
        ]),
        { size: 24 },
    )

    const nonceKeyWithEncoding = BigInt(encoding)

    return await getAccountNonce(client, {
        address: kernel,
        entryPointAddress: entryPoint07Address,
        key: nonceKeyWithEncoding,
    })
}
