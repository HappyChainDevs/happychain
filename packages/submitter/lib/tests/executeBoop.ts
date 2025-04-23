import { createMockTokenAMintHappyTx, signTx } from "./utils";
import {privateKeyToAccount} from "viem/accounts"
import { createPublicClient, http, zeroAddress } from "viem";
import { happychainTestnet } from "viem/chains";
import {createAccount, execute, type Boop, computeBoopHash} from "@happy.tech/submitter-client"
import { serializeBigInt } from "@happy.tech/submitter/client" 

import { abis, deployment } from "@happy.tech/contracts/boop/sepolia";

const SUBMITTER_STAGING_URL = "https://submitter.happy.tech"

const testAccount = privateKeyToAccount("0x8c5a8f60027c4a4654742cca624c7370599b0699dc142d44c9759e3040e201e3")


const nonceTrack = 0n

const publicClient = createPublicClient({
    chain: happychainTestnet,
    transport: http(),
})
async function getNonce(account: `0x${string}`, nonceTrack = 0n): Promise<bigint> {
    return await publicClient.readContract({
        address: deployment.EntryPoint,
        abi: abis.EntryPoint,
        functionName: "nonceValues",
        args: [account, nonceTrack],
    })
}

async function _createAccount(){
    const res = await createAccount({
        owner: testAccount.address,
        salt: "0x01",
    })
    console.log("createAccount", res)
    if (res.isOk()) {
        return res.value.address
    } 
}

async function _execute(tx: Boop){
    const res = await execute({
        tx
    })
    console.log("execute", res)
}
async function run(){
    const account = await _createAccount()
    const tx = await createAndSignMintTx(account!)
    console.log("signed tx", tx)
    const res = await _execute(tx)
    console.log("execute", res)
}
run().then(() => {
    console.log("done")
})


async function createAndSignMintTx(account: `0x${string}`){
    const unsignedTx = {
        account,
        dest: "0x02206faC6469B2f59FC2Bb9d3BC181Fbe703F8B7" as `0x${string}`, // token A on testnet
        nonceTrack: 0n,
        nonceValue: await getNonce(account),
        value: 0n,
        payer: zeroAddress,
        executeGasLimit: 0n,
        gasLimit: 0n,
        validatePaymentGasLimit: 4000000000n,
        validateGasLimit: 4000000000n,
        maxFeePerGas: 1200000000n,
        submitterFee: 100n,
        callData: "0x40c10f19000000000000000000000000d224f746ed779fd492ccadae5cd377e58ee811810000000000000000000000000000000000000000000000000de0b6b3a7640000" as `0x${string}`,
        validatorData: "0x" as `0x${string}`,
        extraData: "0x" as `0x${string}`,
    }
    console.log("unsignedTx", unsignedTx)
    const boopHash = computeBoopHash(216n, unsignedTx)
    console.log("boopHash", boopHash)
    const validatorData = await testAccount.signMessage({ message: { raw: boopHash } })
    const signedTx = { ...unsignedTx, validatorData }
    console.log("signedTx", signedTx)
    return signedTx
}
async function executeBoop(){
    // create account by calling /api/v1/accounts/create
    const accountCreationResult = await fetch(`${SUBMITTER_STAGING_URL}/api/v1/accounts/create`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ owner: testAccount.address, salt: "0x01" }),
    })
    const accountAddress = (await accountCreationResult.json()).address
    console.log({accountAddress})
    console.log("testAccount", testAccount.address)
     
    
    for(let i = 0; i < 1; i++){
        console.log("nonce value ", await getNonce(accountAddress))

        const unsignedTx = await createMockTokenAMintHappyTx(accountAddress,
            await getNonce(accountAddress), nonceTrack)
        unsignedTx.dest = "0x02206faC6469B2f59FC2Bb9d3BC181Fbe703F8B7" // token A on testnet
        unsignedTx.account = accountAddress
        console.log("unsignedTx", unsignedTx)
        console.log("calldata ", unsignedTx.callData)
        
        const signedTx = await signTx(testAccount, unsignedTx)
        console.log("signedTx", signedTx)   
        
        
        console.time("submitter")
        const result = await fetch(`${SUBMITTER_STAGING_URL}/api/v1/submitter/execute`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ tx: serializeBigInt(signedTx) }),
        })
        console.timeEnd("submitter")
        // console.log(result)
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        const response = (await result.json()) as any
        console.log("result", response.status)
        // console.log(response.state.receipt.happyTxHash)
        // console.time("receipt")
        // // get receipt
        // const receipt = await fetch(`https://submitter.happy.tech/api/v1/submitter/receipt/${response.state.receipt.happyTxHash}`, {
        //     method: "GET",
        //     headers: {
        //         "Content-Type": "application/json",
        //     },
        // })
        // const receiptJson = await receipt.json()
        // console.log(receiptJson)
        // console.timeEnd("receipt")
    }
    
}
// executeBoop().then(() => {
//     console.log("done")
// })
