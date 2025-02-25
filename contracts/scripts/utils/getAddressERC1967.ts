import type { Address, Hex } from "viem"
import { concat, encodeDeployData, encodeFunctionData, getAddress, keccak256 } from "viem"

import { abis } from "../../deployments/anvil/happy-aa/abis"
import { ERC1967_CREATION_CODE } from "./creationCode/ERC1967Code"

/**
 * Predicts the address of an ERC1967 proxy that will be deployed by the ScrappyAccountFactory
 * @param salt The deployment salt
 * @param owner The owner address for initialization
 * @param deployer The factory contract address
 */
export function predictDeterministicAddressERC1967(
    salt: Hex,
    owner: Address,
    accountImplementation: Address,
    deployer: Address,
): Address {
    // Step 1: Create initialization data for the proxy
    const initData = encodeFunctionData({
        abi: abis.ScrappyAccount,
        functionName: "initialize",
        args: [owner],
    })

    // Step 2: Combine creation code with constructor args, and calculate the code hash
    const contractCode = encodeDeployData({
        abi: [
            {
                type: "constructor",
                inputs: [
                    { type: "address", name: "implementation" },
                    { type: "bytes", name: "_data" },
                ],
            },
        ],
        bytecode: ERC1967_CREATION_CODE,
        args: [accountImplementation, initData],
    })
    const codeHash = keccak256(contractCode)

    // Step 3: Prepare the salt and CREATE2 input, and calculate the final address
    const combinedSalt = keccak256(concat([salt, owner]))
    const create2Input = concat(["0xff", deployer, combinedSalt, codeHash]) // 0xff CREATE2 prefix
    const predicted = `0x${keccak256(create2Input).slice(26)}`

    return getAddress(predicted)
}
