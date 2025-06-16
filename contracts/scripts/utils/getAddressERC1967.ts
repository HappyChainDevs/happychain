import type { Address, Hex } from "@happy.tech/common"
import { concat, encodeDeployData, encodeFunctionData, getAddress, keccak256 } from "viem"
import { abis } from "../../deployments/anvil/boop/abis"
import { ERC1967_CREATION_CODE } from "./creationCode/ERC1967Code"

/**
 * Predicts the address of an ERC1967 proxy that will be deployed by the HappyAccountBeaconProxyFactory
 * @param salt The deployment salt
 * @param owner The owner address for initialization
 * @param accountImplementation The address of the account implementation contract
 * @param deployer The factory contract address
 *
 * @remarks The caller must handle cases where the calculated address starts with 0xef, which
 * is possible and may cause problems, The caller should re-run the address calculation with a
 * different salt when this occurs. This is important because addresses starting with 0xef can
 * conflict with certain system contracts or cause unexpected behavior.
 */
export function getAddressERC1967(
    salt: Hex,
    owner: Address,
    accountImplementation: Address,
    deployer: Address,
): Address {
    // Step 1: Create initialization data for the proxy
    const initData = encodeFunctionData({
        abi: abis.HappyAccountImpl,
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
    const create2Input = concat(["0xff", deployer, combinedSalt, codeHash]) // 0xff is the CREATE2 prefix
    const predicted = `0x${keccak256(create2Input).slice(26)}`

    return getAddress(predicted)
}
