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
    const combinedSalt = keccak256(encodePacked(["bytes32", "address"], [salt, owner]))

    // _prepareCode in the contract
    const creationCode = ERC1967_CREATION_CODE
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

const ERC1967_CREATION_CODE =
    "0x60a08060405261050d80380380916100178285610292565b833981016040828203126101eb5761002e826102c9565b602083015190926001600160401b0382116101eb57019080601f830112156101eb57815161005b816102dd565b926100696040519485610292565b8184526020840192602083830101116101eb57815f926020809301855e84010152823b15610274577fa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d5080546001600160a01b0319166001600160a01b038516908117909155604051635c60da1b60e01b8152909190602081600481865afa9081156101f7575f9161023a575b50803b1561021a5750817f1cf3b03a6cf19fa2baba4df148e9dcabedea7f8a5c07840e207e5c089be95d3e5f80a282511561020257602060049260405193848092635c60da1b60e01b82525afa9182156101f7575f926101ae575b505f809161018a945190845af43d156101a6573d9161016e836102dd565b9261017c6040519485610292565b83523d5f602085013e6102f8565b505b6080526040516101b6908161035782396080518160460152f35b6060916102f8565b9291506020833d6020116101ef575b816101ca60209383610292565b810103126101eb575f80916101e161018a956102c9565b9394509150610150565b5f80fd5b3d91506101bd565b6040513d5f823e3d90fd5b505050341561018c5763b398979f60e01b5f5260045ffd5b634c9c8ce360e01b5f9081526001600160a01b0391909116600452602490fd5b90506020813d60201161026c575b8161025560209383610292565b810103126101eb57610266906102c9565b5f6100f5565b3d9150610248565b631933b43b60e21b5f9081526001600160a01b038416600452602490fd5b601f909101601f19168101906001600160401b038211908210176102b557604052565b634e487b7160e01b5f52604160045260245ffd5b51906001600160a01b03821682036101eb57565b6001600160401b0381116102b557601f01601f191660200190565b9061031c575080511561030d57805190602001fd5b63d6bda27560e01b5f5260045ffd5b8151158061034d575b61032d575090565b639996b31560e01b5f9081526001600160a01b0391909116600452602490fd5b50803b1561032556fe60806040527f5c60da1b000000000000000000000000000000000000000000000000000000006080526020608060048173ffffffffffffffffffffffffffffffffffffffff7f0000000000000000000000000000000000000000000000000000000000000000165afa8015610107575f9015610163575060203d602011610100575b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f820116608001906080821067ffffffffffffffff8311176100d3576100ce91604052608001610112565b610163565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b503d610081565b6040513d5f823e3d90fd5b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff80602091011261015f5760805173ffffffffffffffffffffffffffffffffffffffff8116810361015f5790565b5f80fd5b5f8091368280378136915af43d5f803e1561017c573d5ff35b3d5ffdfea2646970667358221220648f1d03f585ac867a957a04dcb6d73e2542eb9134ea9285572f5605e1d5284a64736f6c634300081c0033"
