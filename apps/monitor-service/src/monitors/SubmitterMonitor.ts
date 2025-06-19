import { type Boop, BoopClient, computeBoopHash, CreateAccount, type ExecuteSuccess, GetNonce, Onchain } from "@happy.tech/boop-sdk"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import { stringify } from "@happy.tech/common"
import { abis as mockAbis, deployment as mockDeployments } from "@happy.tech/contracts/mocks/anvil"
import { encodeFunctionData, zeroAddress, type Address, type PrivateKeyAccount } from "viem"
import { env } from "../env"
import { sendSlackMessageToAlertChannel } from "../slack"
import { logger } from "../logger"


export const zeroGasLimits = {
    gasLimit: 0,
    executeGasLimit: 0,
    validateGasLimit: 0,
    validatePaymentGasLimit: 0,
}

export type CreateMintBoopInput = {
    account: Address
    nonceValue: bigint
    nonceTrack?: bigint
    amount?: bigint
    gasLimits?: typeof zeroGasLimits,
}

export class SubmitterMonitor {
    async start() {
        setInterval(async () => {
            for (const submitter of env.SUBMITTERS_TO_MONITOR) {
                await this.monitorSubmitter(submitter)
            }
        }, env.SUBMITTER_MONITOR_INTERVAL_MS)
    }

    async monitorSubmitter(submitterUrl: string) {
        const eoa = privateKeyToAccount(generatePrivateKey())
        const boopClient = new BoopClient({
            submitterUrl: submitterUrl,
            rpcUrl: env.RPC_URL,
        })
        const createAccountResult = await boopClient.createAccount({
            owner: eoa.address,
            salt: "0x0000000000000000000000000000000000000000000000000000000000000001",
        })
        if (createAccountResult.status !== CreateAccount.Success) {
            sendSlackMessageToAlertChannel(`Account creation failed for submitter ${submitterUrl}: ${stringify(createAccountResult)}`)
            return
        }
            
        const account = createAccountResult.address as Address
    
        const nonceResult = await boopClient.getNonce({ address: account, nonceTrack: 0n })
        if (nonceResult.status !== GetNonce.Success) {
            sendSlackMessageToAlertChannel(`Nonce retrieval failed for submitter ${submitterUrl}: ${stringify(nonceResult)}`)
            return
        }
        const nonceValue = nonceResult.nonceValue
    
        const boop = await this.createAndSignMintBoop(eoa, { account, nonceValue })
    
        const result = await boopClient.execute({ boop })
        if (result.status !== Onchain.Success) {
            sendSlackMessageToAlertChannel(`Boop execution failed for submitter ${submitterUrl}: ${stringify(result)}`)
            return
        }
        logger.info(`Boop: https://explorer.testnet.happy.tech/tx/${(result as ExecuteSuccess).receipt.evmTxHash}`)
    
        const receiptResult = await boopClient.waitForReceipt({ boopHash: result.receipt.boopHash })
        if (receiptResult.status !== Onchain.Success) {
            sendSlackMessageToAlertChannel(`Receipt not found for submitter ${submitterUrl}: ${stringify(receiptResult)}`)
            return
        }
    }

    
    private createMintBoop({
        account,
        nonceValue,
        nonceTrack = 0n,
        amount = 10n ** 18n,
        gasLimits = zeroGasLimits,
    }: CreateMintBoopInput): Boop {
        return {
            account,
            dest: mockDeployments.MockTokenA,
            nonceTrack: nonceTrack,
            nonceValue: nonceValue,
            value: 0n,
    
            // payer is default
            payer: zeroAddress,
            ...gasLimits,
            maxFeePerGas: 0n,
            submitterFee: 0n,
    
            callData: encodeFunctionData({
                abi: mockAbis.MockTokenA,
                functionName: "mint",
                args: [account, amount],
            }),
            validatorData: "0x",
            extraData: "0x",
        }
    }
    
    private async signBoop(account: PrivateKeyAccount, boop: Boop): Promise<Boop> {
        const boopHash = computeBoopHash(env.CHAIN_ID, boop)
        const validatorData = await account.signMessage({ message: { raw: boopHash } })
        return { ...boop, validatorData }
    }
    
    private async createAndSignMintBoop(account: PrivateKeyAccount, input: CreateMintBoopInput): Promise<Boop> {
        const boop = this.createMintBoop(input)
        return this.signBoop(account,  boop)
    }
}