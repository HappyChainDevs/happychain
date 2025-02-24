import type { Address, Hex } from "viem"
import { concat, encodeAbiParameters, getAddress, keccak256, parseAbiParameters } from "viem"

const ERC1967_CREATION_CODE: Hex =
    "0x60806040526102a88038038061001481610168565b92833981016040828203126101645781516001600160a01b03811692909190838303610164576020810151906001600160401b03821161016457019281601f8501121561016457835161006e610069826101a1565b610168565b9481865260208601936020838301011161016457815f926020809301865e86010152823b15610152577f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc80546001600160a01b031916821790557fbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b5f80a282511561013a575f8091610122945190845af43d15610132573d91610113610069846101a1565b9283523d5f602085013e6101bc565b505b604051608d908161021b8239f35b6060916101bc565b50505034156101245763b398979f60e01b5f5260045ffd5b634c9c8ce360e01b5f5260045260245ffd5b5f80fd5b6040519190601f01601f191682016001600160401b0381118382101761018d57604052565b634e487b7160e01b5f52604160045260245ffd5b6001600160401b03811161018d57601f01601f191660200190565b906101e057508051156101d157805190602001fd5b63d6bda27560e01b5f5260045ffd5b81511580610211575b6101f1575090565b639996b31560e01b5f9081526001600160a01b0391909116600452602490fd5b50803b156101e956fe60806040525f8073ffffffffffffffffffffffffffffffffffffffff7f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc5416368280378136915af43d5f803e156053573d5ff35b3d5ffdfea26469706673582212200057f877efd4a3cdc928c17f1d9afe58eb2ee2dea34c55210810583444495b8164736f6c634300081a0033"

/**
 * Predicts the address of an ERC1967 proxy that will be deployed by the ScrappyAccountFactory
 * @param salt The deployment salt
 * @param owner The owner address for initialization
 * @param deployer The factory contract address
 * @returns The predicted address where the proxy will be deployed
 */
export async function predictDeterministicAddressERC1967(
    salt: Hex,
    owner: Address,
    accountImplementation: Address,
    deployer: Address,
): Promise<Address> {
    // Step 1: Combine salt with owner, to avoid frontrunning attacks
    const combinedSalt = keccak256(concat([salt, owner]))

    // Step 2: Create initialization data for the proxy
    const INITIALIZE_SELECTOR = "0xc4d66de8" // Function selector for initialize(address)
    const initParams = encodeAbiParameters(parseAbiParameters("address owner"), [owner])
    const initData: Hex = `0x${INITIALIZE_SELECTOR.slice(2)}${initParams.slice(2)}`

    // Step 3: Create constructor arguments for the proxy
    const constructorArgs = encodeAbiParameters(parseAbiParameters("address implementation, bytes memory _data"), [
        accountImplementation,
        initData,
    ])

    // Step 4: Combine creation code with constructor args, and calculate the code hash
    const contractCode = concat([ERC1967_CREATION_CODE, constructorArgs])
    const codeHash = keccak256(contractCode)

    // Step 6: Create CREATE2 input
    const create2Input = concat(["0xff", deployer, combinedSalt, codeHash])

    // Step 7: Calculate the final address
    const predicted = `0x${keccak256(create2Input).slice(26)}`
    const predictedAddress = getAddress(predicted)

    return predictedAddress
}
