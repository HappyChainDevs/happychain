import { type Address, zeroAddress } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { encodeFunctionData, parseEther } from "viem/utils"
import { abis, deployment } from "#src/deployments"
import type { HappyTx } from "#src/tmp/interface/HappyTx"

export function createTestAccount(privateKey = generatePrivateKey()) {
    const account = privateKeyToAccount(privateKey)
    const nonceMap = new Map()
    return {
        account,
        createHappyTx(nonceTrack = 0n) {
            const nonceValue = nonceMap.get(nonceTrack) ?? 0n
            const tx = createMockTokenAMintHappyTx(account.address)
            tx.nonceTrack = nonceTrack
            tx.nonceValue = nonceValue
            nonceMap.set(nonceTrack, nonceValue + 1n)
            return tx
        },
    }
}

function createMockTokenAMintHappyTx(account: Address): HappyTx {
    return {
        account,
        dest: deployment.MockTokenA,
        nonceTrack: 0n, // using as default
        nonceValue: 0n, // as default
        value: 0n,
        // paymaster is default
        paymaster: zeroAddress,
        executeGasLimit: 0n,
        gasLimit: 0n,
        maxFeePerGas: 0n,
        submitterFee: 0n,
        callData: encodeFunctionData({
            abi: abis.MockTokenA,
            functionName: "mint",
            args: [account, parseEther("0.001")],
        }),
        paymasterData: "0x",
        validatorData: "0x",
        extraData: "0x",
    }
}
