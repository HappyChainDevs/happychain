import type { Address, Hex } from "viem"
import { concat, getAddress, keccak256 } from "viem"

/**
 * Predicts the address of an ERC1967 proxy that will be deployed by Solady's LibClone.createDeterministicERC1967
 * @param implementation The implementation contract address
 * @param salt The salt used for CREATE2
 * @param deployer The address of the factory/deployer contract
 * @returns The predicted address where the proxy will be deployed
 */
export function predictDeterministicAddressERC1967(implementation: Address, salt: Hex, deployer: Address): Address {
    const proxyCode = concat([
        "0x603d3d8160223d3973",
        implementation,
        "0x6009",
        "0x5155f3363d3d373d3d363d7f360894a13ba1a3210667c828492db98dca3e2076",
        "0xcc3735a920a3ca505d382bbc545af43d6000803e6038573d6000fd5b3d6000f3",
    ])
    const initCodeHash = keccak256(proxyCode)
    const create2Input = concat(["0xff", deployer, salt, initCodeHash])
    const predicted = `0x${keccak256(create2Input).slice(26)}`
    return getAddress(predicted)
}
