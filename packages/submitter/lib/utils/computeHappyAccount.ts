import type { Address, Hex } from "viem"
import { concat, encodeDeployData, getAddress, keccak256 } from "viem"
import { deployment } from "#lib/env"
import { ERC1967_CONSTRUCTOR_ABI, ERC1967_CREATION_CODE } from "../data/erc1967_creation_code"

/**
 * Predicts the address of the HappyAccount that will be deployed by the HappyAccountFactory
 * @param salt The deployment salt
 * @param owner The owner address for initialization
 */
export function computeHappyAccount(salt: Hex, owner: Address): Address {
    const accountImplementation = deployment.HappyAccountImpl
    const deployer = deployment.HappyAccountBeaconProxyFactory

    // Step 1: Create initialization data for the proxy
    const initData = getInitData(owner)

    // Step 2: Combine creation code with constructor args, and calculate the code hash
    const codeHash = getCodeHash(accountImplementation, initData)

    // Step 3: Prepare the salt and CREATE2 input, and calculate the final address
    const predicted = getCreate2Address(deployer, salt, codeHash, owner)

    // Step 4: Validate & return the address
    return getAddress(predicted)
}

function getInitData(_owner: `0x${string}`) {
    return "0x" as const
    // TODO: replace with the actual initialization data
    // return encodeFunctionData({
    //     abi: abis.HappyAccountImpl,
    //     functionName: "initialize",
    //     args: [owner],
    // })
}

function getCodeHash(implementation: `0x${string}`, initData: `0x${string}`) {
    const contractCode = encodeDeployData({
        abi: ERC1967_CONSTRUCTOR_ABI,
        bytecode: ERC1967_CREATION_CODE,
        args: [implementation, initData],
    })
    return keccak256(contractCode)
}

function getCreate2Address(
    deployer: `0x${string}`,
    salt: `0x${string}`,
    codeHash: `0x${string}`,
    owner: `0x${string}`,
): `0x${string}` {
    const CREATE2_PREFIX = "0xff"
    const combinedSalt = keccak256(concat([salt, owner]))
    const create2Input = concat([CREATE2_PREFIX, deployer, combinedSalt, codeHash])
    return `0x${keccak256(create2Input).slice(26)}`
}
