import type { Address, Hex } from "@happy.tech/common"
import {
    concatHex,
    encodeAbiParameters,
    encodeFunctionData,
    getAddress as formatAddress,
    keccak256,
    parseAbiParameters,
} from "viem"
import { encodePacked, parseAbi } from "viem/utils"
import { abis, deployment } from "#lib/env"
import { publicClient } from "#lib/utils/clients"

/**
 * Computes the predicted address of the account the submitter would deploy
 * for this (salt, owner) pair, fully locally.
 */
export function computeHappyAccountAddress(salt: Hex, owner: Address): Address {
    if (!deployment.AccountProxyCreationCode) {
        throw new Error("Proxy creation code not initialized. The submitter must initialize it first.")
    }

    const combinedSalt = keccak256(encodePacked(["bytes32", "address"], [salt, owner]))

    // _prepareCode in the contract
    const creationCode = deployment.AccountProxyCreationCode
    const initData = encodeFunctionData({
        abi: initializeAbi,
        functionName: "initialize",
        args: [owner],
    })
    const constructorArgs = encodeAbiParameters(
        constructorArgsAbi, //
        [deployment.HappyAccountBeacon, initData],
    )
    const code = concatHex([creationCode, constructorArgs]) // no need for encodePacked, they're both `bytes`

    // _getAddress in the contract
    const hash = keccak256(
        encodePacked(
            ["bytes1", "address", "bytes32", "bytes32"],
            ["0xff", deployment.HappyAccountBeaconProxyFactory, combinedSalt, keccak256(code)],
        ),
    )
    return formatAddress(`0x${hash.slice(26)}`) // keep last 20 bytes, chop off 12 bytes + 0x
}

// For reference
async function _getPredictedAddressOnchain(salt: Hex, owner: Address): Promise<Address> {
    return await publicClient.readContract({
        address: deployment.HappyAccountBeaconProxyFactory,
        abi: abis.HappyAccountBeaconProxyFactory,
        functionName: "getAddress",
        args: [salt, owner],
    })
}

const initializeAbi = parseAbi(["function initialize(address owner)"])
const constructorArgsAbi = parseAbiParameters(["address beacon, bytes data"])
